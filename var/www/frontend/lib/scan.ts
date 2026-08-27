/**
 * Core scan engine — shared by /api/releases/scan and /api/releases/sync.
 * Contains no HTTP/auth logic.
 */
import { XMLParser } from "fast-xml-parser";
import {
  getArtistProfiles,
  getCandidates,
  upsertCandidate,
  normalizeTitle,
  makeCandidateId,
  getSyncStatus,
  saveSyncStatus,
  getPosts,
  SyncStatus,
} from "./data";
import type { ArtistProfile, ReleaseCandidate } from "@/types";

const CUTOFF_MONTHS = 60;

export function getCutoffDate(): Date {
  const d = new Date();
  d.setMonth(d.getMonth() - CUTOFF_MONTHS);
  return d;
}

// =========================================
// Déduplication
// =========================================
function monthDiff(yyyyMM1: string, yyyyMM2: string): number {
  const [y1, m1] = yyyyMM1.split("-").map(Number);
  const [y2, m2] = yyyyMM2.split("-").map(Number);
  return Math.abs(y1 * 12 + m1 - (y2 * 12 + m2));
}

// Regex non-global (safe pour réutilisation en module)
const FEAT_RE = / (feat|ft|w|with|featuring)[. ].*/;
const TYPE_PREFIX_RE = /^(flip|single|ep|album|mixtape|mix|live session|clip|remix|single remix)\s+/;

/**
 * Génère plusieurs formes normalisées d'un titre pour la comparaison cross-source :
 * - titre complet normalisé
 * - slug sans espaces (ex: "PassCulture" ≈ "Pass Culture")
 * - sans feat/ft/w (ex: "baby angel w/ KZY" → "baby angel")
 * - sans préfixe de type (ex: "Flip - baby angel" → "baby angel")
 * - partie après " - " dans le titre brut (ex: "yetii - bad fairy" → "bad fairy")
 */
function buildTitleForms(rawTitle: string): string[] {
  const forms = new Set<string>();
  if (!rawTitle) return [];

  const full = normalizeTitle(rawTitle);
  forms.add(full);
  forms.add(full.replace(/ /g, "")); // slug: PassCulture ≈ Pass Culture

  // Sans références feat/ft/w
  const noFeat = full.replace(FEAT_RE, "").trim();
  if (noFeat.length >= 4 && noFeat !== full) {
    forms.add(noFeat);
    forms.add(noFeat.replace(/ /g, ""));
  }

  // Sans préfixe de type (Flip -, Single -, etc.)
  const noPrefix = full.replace(TYPE_PREFIX_RE, "").trim();
  if (noPrefix.length >= 4 && noPrefix !== full) {
    forms.add(noPrefix);
    forms.add(noPrefix.replace(/ /g, ""));
    const noPrefixNoFeat = noPrefix.replace(FEAT_RE, "").trim();
    if (noPrefixNoFeat.length >= 4) {
      forms.add(noPrefixNoFeat);
      forms.add(noPrefixNoFeat.replace(/ /g, ""));
    }
  }

  // Partie après " - " dans le titre brut (ex: "yetii - bad fairy (prod. xectnr)" → "bad fairy")
  const dashIdx = rawTitle.indexOf(" - ");
  if (dashIdx !== -1) {
    const afterDash = normalizeTitle(rawTitle.slice(dashIdx + 3))
      .replace(/\s*\(?prod[\s\S]*$/, "")  // retire "(prod. ...)"
      .trim();
    if (afterDash.length >= 4) {
      forms.add(afterDash);
      forms.add(afterDash.replace(/ /g, ""));
      const afterDashNoFeat = afterDash.replace(FEAT_RE, "").trim();
      if (afterDashNoFeat.length >= 4) {
        forms.add(afterDashNoFeat);
        forms.add(afterDashNoFeat.replace(/ /g, ""));
      }
    }
  }

  return [...forms].filter((f) => f.length >= 4);
}

/** Vérifie si deux ensembles de formes se recouvrent (substring bidirectionnel). */
function formsOverlap(formsA: string[], formsB: string[]): boolean {
  for (const a of formsA) {
    for (const b of formsB) {
      if (a === b) return true;
      // Substring check uniquement pour les formes assez longues (évite faux positifs)
      if (a.length >= 6 && b.length >= 6 && (a.includes(b) || b.includes(a))) return true;
    }
  }
  return false;
}

export function isDuplicate(
  title: string,
  artist: string,
  date: string,
  existingTitles: Array<{ title: string; subtitle?: string; artist: string; date: string }>
): boolean {
  const normArtist = normalizeTitle(artist);
  const yyyyMM = date.slice(0, 7);
  const candidateForms = buildTitleForms(title);

  for (const e of existingTitles) {
    if (normalizeTitle(e.artist) !== normArtist) continue;
    if (monthDiff(yyyyMM, e.date.slice(0, 7)) > 1) continue;

    // Compare vs titre du post — skip si le titre est juste le nom de l'artiste (trop générique)
    const eNormTitle = normalizeTitle(e.title);
    if (eNormTitle !== normalizeTitle(e.artist) && eNormTitle.length >= 4) {
      const existingForms = buildTitleForms(e.title);
      if (formsOverlap(candidateForms, existingForms)) return true;
    }

    // Compare vs subtitle du post (ex: "Single - Pass Culture", "Flip - baby angel")
    if (e.subtitle) {
      const eSubNorm = normalizeTitle(e.subtitle).replace(TYPE_PREFIX_RE, "").trim();
      const subForms = buildTitleForms(eSubNorm.length >= 4 ? eSubNorm : e.subtitle);
      if (formsOverlap(candidateForms, subForms)) return true;
    }
  }
  return false;
}


// =========================================
// Deezer
// =========================================
interface DeezerAlbum {
  id: number;
  title: string;
  release_date?: string;
  cover_xl?: string;
  cover_big?: string;
  link?: string;
  record_type?: string;
}

async function scanDeezer(
  profile: ArtistProfile,
  cutoff: Date,
  existingTitles: Array<{ title: string; subtitle?: string; artist: string; date: string }>
): Promise<{ candidates: ReleaseCandidate[]; errors: string[] }> {
  const candidates: ReleaseCandidate[] = [];
  const errors: string[] = [];
  if (!profile.deezerArtistId) return { candidates, errors };

  try {
    const url = `https://api.deezer.com/artist/${profile.deezerArtistId}/albums?limit=50`;
    const res = await fetch(url, {
      signal: AbortSignal.timeout(8000),
      headers: { "User-Agent": "GrandeMaisonBot/1.0" },
    });
    if (!res.ok) throw new Error(`Deezer HTTP ${res.status}`);
    const json = (await res.json()) as { data?: DeezerAlbum[] };
    const albums = json.data ?? [];

    const allowed = ["album", "ep", "single", "ep_single"];
    for (const album of albums) {
      if (!allowed.includes(album.record_type ?? "")) continue;
      const date = album.release_date ?? "";
      if (!date || new Date(date) < cutoff) continue;
      if (isDuplicate(album.title, profile.name, date, existingTitles)) continue;

      const id = makeCandidateId(profile.name, album.title, date.slice(0, 7));
      candidates.push({
        id,
        title: album.title,
        artist: profile.name,
        date,
        image: album.cover_xl ?? album.cover_big ?? "",
        source: "deezer",
        sourceLink: album.link ?? `https://www.deezer.com/album/${album.id}`,
        status: "pending",
        detectedAt: new Date().toISOString(),
        recordType: album.record_type,
      });
    }
  } catch (err) {
    errors.push(`Deezer [${profile.name}]: ${String(err)}`);
  }

  return { candidates, errors };
}

// =========================================
// YouTube (Atom RSS)
// =========================================
interface YTEntry {
  title?: string;
  published?: string;
  "yt:videoId"?: string;
  "media:group"?: { "media:thumbnail"?: { "@_url"?: string } };
}

async function scanYouTube(
  profile: ArtistProfile,
  cutoff: Date,
  existingTitles: Array<{ title: string; subtitle?: string; artist: string; date: string }>
): Promise<{ candidates: ReleaseCandidate[]; errors: string[] }> {
  const candidates: ReleaseCandidate[] = [];
  const errors: string[] = [];
  if (!profile.youtubeChannelId) return { candidates, errors };

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    isArray: (name) => name === "entry",
  });

  try {
    const url = `https://www.youtube.com/feeds/videos.xml?channel_id=${profile.youtubeChannelId}`;
    const res = await fetch(url, {
      signal: AbortSignal.timeout(8000),
      headers: { "User-Agent": "GrandeMaisonBot/1.0" },
    });
    if (!res.ok) throw new Error(`YouTube HTTP ${res.status}`);
    const xml = await res.text();
    const parsed = parser.parse(xml);
    const entries: YTEntry[] = parsed?.feed?.entry ?? [];

    for (const entry of entries) {
      const title: string = entry?.title ?? "";
      const published: string = entry?.published ?? "";
      const videoId: string = entry?.["yt:videoId"] ?? "";
      const thumbnail: string =
        entry?.["media:group"]?.["media:thumbnail"]?.["@_url"] ?? "";

      if (!published || new Date(published) < cutoff) continue;
      if (!title) continue;
      const date = published.slice(0, 10);
      if (isDuplicate(title, profile.name, date, existingTitles)) continue;

      const id = makeCandidateId(profile.name, title, date.slice(0, 7));
      candidates.push({
        id,
        title,
        artist: profile.name,
        date,
        image: thumbnail || `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
        source: "youtube",
        sourceLink: `https://youtu.be/${videoId}`,
        watchLink: `https://youtu.be/${videoId}`,
        status: "pending",
        detectedAt: new Date().toISOString(),
      });
    }
  } catch (err) {
    errors.push(`YouTube [${profile.name}]: ${String(err)}`);
  }

  return { candidates, errors };
}

// =========================================
// SoundCloud (API v2 avec client_id dynamique)
// Albums → EP/album comme une unité
// Tracks → singles seulement (non présents dans un album)
// =========================================
interface SCTrack {
  id?: number;
  title?: string;
  created_at?: string;
  permalink_url?: string;
  artwork_url?: string;
}

interface SCAlbum {
  id?: number;
  title?: string;
  created_at?: string;
  release_date?: string;
  permalink_url?: string;
  artwork_url?: string;
  set_type?: string;
  is_album?: boolean;
  tracks?: Array<{ id?: number }>;
}

async function getSoundCloudClientId(): Promise<string> {
  const pageRes = await fetch("https://soundcloud.com", {
    signal: AbortSignal.timeout(10000),
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
  });
  if (!pageRes.ok) throw new Error(`SoundCloud page HTTP ${pageRes.status}`);
  const html = await pageRes.text();
  const m = html.match(/window\.__sc_hydration\s*=\s*(\[[\s\S]*?\]);/);
  if (!m) throw new Error("SoundCloud: hydration JSON introuvable");
  const hydration: Array<{ hydratable?: string; data?: { id?: string } }> = JSON.parse(m[1]);
  const apiClient = hydration.find((b) => b.hydratable === "apiClient");
  if (!apiClient?.data?.id) throw new Error("SoundCloud: client_id introuvable");
  return apiClient.data.id;
}

async function scFetch<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(10000),
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "Origin": "https://soundcloud.com",
      "Referer": "https://soundcloud.com/",
    },
  });
  if (!res.ok) throw new Error(`SoundCloud API HTTP ${res.status} — ${url}`);
  return res.json() as Promise<T>;
}

async function scanSoundCloud(
  profile: ArtistProfile,
  cutoff: Date,
  existingTitles: Array<{ title: string; subtitle?: string; artist: string; date: string }>
): Promise<{ candidates: ReleaseCandidate[]; errors: string[] }> {
  const candidates: ReleaseCandidate[] = [];
  const errors: string[] = [];
  if (!profile.soundcloudUserId) return { candidates, errors };

  try {
    const clientId = await getSoundCloudClientId();
    const base = `https://api-v2.soundcloud.com/users/${profile.soundcloudUserId}`;

    // 1. Fetch albums/EPs
    const albumsJson = await scFetch<{ collection?: SCAlbum[] }>(
      `${base}/albums?client_id=${clientId}&limit=50`
    );
    const albums = albumsJson.collection ?? [];

    // Collect all track IDs that belong to an album (to exclude from singles)
    const albumTrackIds = new Set<number>();
    for (const album of albums) {
      for (const t of album.tracks ?? []) {
        if (t.id) albumTrackIds.add(t.id);
      }
    }

    // Create one candidate per album
    for (const album of albums) {
      const title: string = album.title ?? "";
      // Prefer release_date (actual release) over created_at (upload date)
      const rawDate: string = album.release_date ?? album.created_at ?? "";
      if (!rawDate || !title) continue;
      const date = new Date(rawDate).toISOString().slice(0, 10);
      if (new Date(date) < cutoff) continue;
      if (isDuplicate(title, profile.name, date, existingTitles)) continue;

      const image: string = (album.artwork_url ?? "").replace("-large", "-t500x500");
      const link: string = album.permalink_url ?? "";
      const recordType: string | undefined = album.set_type ?? (album.is_album ? "album" : undefined);
      const id = makeCandidateId(profile.name, title, date.slice(0, 7));

      candidates.push({
        id,
        title,
        artist: profile.name,
        date,
        image,
        source: "soundcloud",
        sourceLink: link,
        listenLink: link,
        status: "pending",
        detectedAt: new Date().toISOString(),
        recordType,
      });
    }

    // 2. Fetch individual tracks (singles only — skip those in an album)
    const tracksJson = await scFetch<{ collection?: SCTrack[] }>(
      `${base}/tracks?client_id=${clientId}&limit=50&linked_partitioning=1`
    );
    const tracks = tracksJson.collection ?? [];

    for (const track of tracks) {
      // Skip if this track belongs to an album already detected above
      if (track.id && albumTrackIds.has(track.id)) continue;

      const title: string = track.title ?? "";
      const createdAt: string = track.created_at ?? "";
      const link: string = track.permalink_url ?? "";
      const image: string = (track.artwork_url ?? "").replace("-large", "-t500x500");

      if (!createdAt || !title) continue;
      const date = new Date(createdAt).toISOString().slice(0, 10);
      if (new Date(date) < cutoff) continue;
      if (isDuplicate(title, profile.name, date, existingTitles)) continue;

      const id = makeCandidateId(profile.name, title, date.slice(0, 7));
      candidates.push({
        id,
        title,
        artist: profile.name,
        date,
        image,
        source: "soundcloud",
        sourceLink: link,
        listenLink: link,
        status: "pending",
        detectedAt: new Date().toISOString(),
      });
    }
  } catch (err) {
    errors.push(`SoundCloud [${profile.name}]: ${String(err)}`);
  }

  return { candidates, errors };
}

// =========================================
// Main scan function
// =========================================
export interface ScanResult {
  new: number;
  total: number;
  errors: string[];
  perArtist: SyncStatus["perArtist"];
}

export async function runScan(filterArtistId?: string | null): Promise<ScanResult> {
  const cutoff = getCutoffDate();
  const allProfiles = getArtistProfiles();
  const profiles = filterArtistId
    ? allProfiles.filter((p) => p.id === filterArtistId)
    : allProfiles;

  // Build existing titles from PUBLISHED POSTS only (not pending candidates).
  // Pending candidates are handled by upsertCandidate (merge by ID + extraSources).
  const existingPosts = getPosts();
  const existingTitles = existingPosts.map((p) => ({
    title: p.title,
    subtitle: p.subtitle,
    artist: p.artist,
    date: p.date,
  }));

  let totalNew = 0;
  const allErrors: string[] = [];
  const perArtistStatus: SyncStatus["perArtist"] = {};

  for (const profile of profiles) {
    const hasAnySource =
      profile.deezerArtistId || profile.youtubeChannelId || profile.soundcloudUserId;
    if (!hasAnySource) continue;

    const artistErrors: string[] = [];
    let artistNew = 0;

    const [deezer, yt, sc] = await Promise.all([
      scanDeezer(profile, cutoff, existingTitles),
      scanYouTube(profile, cutoff, existingTitles),
      scanSoundCloud(profile, cutoff, existingTitles),
    ]);

    const allCandidates = [...deezer.candidates, ...yt.candidates, ...sc.candidates];
    artistErrors.push(...deezer.errors, ...yt.errors, ...sc.errors);

    for (const candidate of allCandidates) {
      // upsertCandidate handles dedup by ID: creates new, or adds extraSources if same ID+different source
      const { created } = upsertCandidate(candidate);
      if (created) {
        artistNew++;
        totalNew++;
      }
    }

    perArtistStatus[profile.id] = {
      ok: artistErrors.length === 0,
      count: artistNew,
      lastScan: new Date().toISOString(),
    };
    allErrors.push(...artistErrors);
  }

  // Persist sync status
  const prevStatus = getSyncStatus();
  saveSyncStatus({
    ...prevStatus,
    lastScan: new Date().toISOString(),
    errors: allErrors,
    perArtist: { ...(prevStatus.perArtist ?? {}), ...perArtistStatus },
  });

  return {
    new: totalNew,
    total: getCandidates().filter((c) => c.status === "pending").length,
    errors: allErrors,
    perArtist: perArtistStatus,
  };
}
