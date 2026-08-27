import fs from "fs";
import path from "path";
import crypto from "crypto";
import {
  ArtistProfile,
  Post,
  PlaylistData,
  UsersJson,
  Vst,
  ReleaseCandidate,
} from "@/types";
import { PATHS } from "./paths";

function readJson<T>(filePath: string): T {
  const raw = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(raw) as T;
}

function writeJson<T>(filePath: string, data: T): void {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
}

// =========================================
// Artists
// =========================================
export function getArtistNames(): string[] {
  return readJson<string[]>(PATHS.ARTISTS_JSON);
}

export function getArtistProfiles(): ArtistProfile[] {
  return readJson<ArtistProfile[]>(PATHS.ARTISTS_PROFILES_JSON);
}

export function saveArtistProfiles(profiles: ArtistProfile[]): void {
  writeJson(PATHS.ARTISTS_PROFILES_JSON, profiles);
}

export function getArtistProfileById(id: string): ArtistProfile | null {
  const profiles = getArtistProfiles();
  return profiles.find((p) => p.id === id) ?? null;
}

/** Find an artist profile by its connected Stripe account id (acct_xxx). */
export function getArtistByStripeAccount(accountId: string): ArtistProfile | null {
  return getArtistProfiles().find((p) => p.stripeAccountId === accountId) ?? null;
}

/** Patch the Stripe fields of an artist profile in place. */
export function setArtistStripe(
  artistId: string,
  fields: Partial<
    Pick<
      ArtistProfile,
      "stripeAccountId" | "stripeChargesEnabled" | "stripeDetailsSubmitted"
    >
  >
): ArtistProfile | null {
  const profiles = getArtistProfiles();
  const idx = profiles.findIndex((p) => p.id === artistId);
  if (idx === -1) return null;
  profiles[idx] = { ...profiles[idx], ...fields };
  saveArtistProfiles(profiles);
  return profiles[idx];
}

// =========================================
// Timeline / Posts
// =========================================
export function getPosts(): Post[] {
  return readJson<Post[]>(PATHS.TIMELINE_JSON);
}

export function savePosts(posts: Post[]): void {
  writeJson(PATHS.TIMELINE_JSON, posts);
}

export function getPostById(id: number): Post | null {
  return getPosts().find((p) => p.id === id) ?? null;
}

export function addPost(post: Omit<Post, "id">): Post {
  const posts = getPosts();
  const newPost: Post = { ...post, id: Date.now() };
  posts.unshift(newPost);
  savePosts(posts);
  return newPost;
}

export function updatePost(id: number, updates: Partial<Post>): Post | null {
  const posts = getPosts();
  const idx = posts.findIndex((p) => p.id === id);
  if (idx === -1) return null;
  posts[idx] = { ...posts[idx], ...updates, id };
  savePosts(posts);
  return posts[idx];
}

export function deletePost(id: number): boolean {
  const posts = getPosts();
  const filtered = posts.filter((p) => p.id !== id);
  if (filtered.length === posts.length) return false;
  savePosts(filtered);
  return true;
}

// =========================================
// Playlists
// =========================================
const DEFAULT_PLAYLIST_DATA: PlaylistData = {
  active_playlist: null,
  playlists: [],
};

export function getPlaylistData(): PlaylistData {
  if (!fs.existsSync(PATHS.PLAYLIST_JSON)) return DEFAULT_PLAYLIST_DATA;
  try {
    return readJson<PlaylistData>(PATHS.PLAYLIST_JSON);
  } catch {
    return DEFAULT_PLAYLIST_DATA;
  }
}

export function savePlaylistData(data: PlaylistData): void {
  writeJson(PATHS.PLAYLIST_JSON, data);
}

// =========================================
// Users
// =========================================
export function getUsers(): UsersJson {
  return readJson<UsersJson>(PATHS.USERS_JSON);
}

export function saveUsers(users: UsersJson): void {
  // Write outside web root — secure path
  const dir = path.dirname(PATHS.USERS_JSON);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  writeJson(PATHS.USERS_JSON, users);
}

// =========================================
// Current track info (written by Liquidsoap log)
// =========================================
export interface TrackInfoFile {
  filename: string;
  start_time: number;
}

export function getCurrentTrackInfo(): TrackInfoFile | null {
  if (!fs.existsSync(PATHS.TRACK_INFO_TMP)) return null;
  try {
    return readJson<TrackInfoFile>(PATHS.TRACK_INFO_TMP);
  } catch {
    return null;
  }
}

export function getDurationCache(): Record<string, number> {
  if (!fs.existsSync(PATHS.DURATION_CACHE_TMP)) return {};
  try {
    return readJson<Record<string, number>>(PATHS.DURATION_CACHE_TMP);
  } catch {
    return {};
  }
}

export function saveDurationCache(cache: Record<string, number>): void {
  writeJson(PATHS.DURATION_CACHE_TMP, cache);
}

// =========================================
// VST Plugins
// =========================================
function ensureVstsFile(): void {
  if (!fs.existsSync(PATHS.VSTS_JSON)) writeJson(PATHS.VSTS_JSON, []);
}

export function getVsts(): Vst[] {
  ensureVstsFile();
  return readJson<Vst[]>(PATHS.VSTS_JSON);
}

export function saveVsts(vsts: Vst[]): void {
  writeJson(PATHS.VSTS_JSON, vsts);
}

export function addVst(vst: Omit<Vst, "id">): Vst {
  const vsts = getVsts();
  const newVst: Vst = { ...vst, id: Date.now() };
  vsts.unshift(newVst);
  saveVsts(vsts);
  return newVst;
}

export function updateVst(id: number, updates: Partial<Omit<Vst, "id">>): Vst | null {
  const vsts = getVsts();
  const idx = vsts.findIndex((v) => v.id === id);
  if (idx === -1) return null;
  vsts[idx] = { ...vsts[idx], ...updates, id };
  saveVsts(vsts);
  return vsts[idx];
}

export function deleteVst(id: number): boolean {
  const vsts = getVsts();
  const filtered = vsts.filter((v) => v.id !== id);
  if (filtered.length === vsts.length) return false;
  saveVsts(filtered);
  return true;
}

// =========================================
// Normalisation (dédup cross-source)
// =========================================
export function normalizeTitle(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/œ/g, "oe")  // ligatures non décomposables en NFD
    .replace(/æ/g, "ae")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function makeCandidateId(artist: string, title: string, yyyyMM: string): string {
  // Normalisation légère pour l'ID : conserve + et - pour distinguer les versions
  // (ex: "5x+ d'Étoiles" ≠ "5x- d'étoiles")
  const normalizeForId = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/œ/g, "oe")
      .replace(/æ/g, "ae")
      .replace(/[^a-z0-9+\- ]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  const key = `${normalizeForId(artist)}:${normalizeForId(title)}:${yyyyMM}`;
  return crypto.createHash("sha256").update(key).digest("hex").slice(0, 16);
}

// =========================================
// Release Candidates
// =========================================
function ensureCandidatesFile(): void {
  if (!fs.existsSync(PATHS.RELEASES_CANDIDATES_JSON)) {
    writeJson(PATHS.RELEASES_CANDIDATES_JSON, []);
  }
}

export function getCandidates(): ReleaseCandidate[] {
  ensureCandidatesFile();
  return readJson<ReleaseCandidate[]>(PATHS.RELEASES_CANDIDATES_JSON);
}

export function saveCandidates(candidates: ReleaseCandidate[]): void {
  writeJson(PATHS.RELEASES_CANDIDATES_JSON, candidates);
}

/** Upsert un candidate: crée si inconnu, skip si déjà existant (préserve les éditions humaines). */
export function upsertCandidate(candidate: ReleaseCandidate): { created: boolean } {
  const candidates = getCandidates();
  const idx = candidates.findIndex((c) => c.id === candidate.id);
  if (idx !== -1) {
    // Candidate already exists — add new source to extraSources if different
    const existing = candidates[idx];
    if (candidate.source !== existing.source) {
      const extras = existing.extraSources ?? [];
      const alreadyListed = extras.some((e) => e.source === candidate.source);
      if (!alreadyListed) {
        const updated: ReleaseCandidate = {
          ...existing,
          extraSources: [...extras, { source: candidate.source, sourceLink: candidate.sourceLink }],
        };
        // Auto-fill listenLink: SoundCloud overrides Deezer; Deezer fills if empty
        if (candidate.source === "soundcloud") {
          updated.listenLink = candidate.sourceLink;
        } else if (candidate.source === "deezer" && !updated.listenLink) {
          updated.listenLink = candidate.sourceLink;
        }
        // Auto-fill watchLink from YouTube if not already set
        if (candidate.source === "youtube" && !updated.watchLink) {
          updated.watchLink = candidate.sourceLink;
        }
        candidates[idx] = updated;
        saveCandidates(candidates);
      }
    }
    return { created: false };
  }
  candidates.unshift(candidate);
  saveCandidates(candidates);
  return { created: true };
}

export function getCandidateById(id: string): ReleaseCandidate | null {
  return getCandidates().find((c) => c.id === id) ?? null;
}

export function updateCandidate(id: string, updates: Partial<ReleaseCandidate>): ReleaseCandidate | null {
  const candidates = getCandidates();
  const idx = candidates.findIndex((c) => c.id === id);
  if (idx === -1) return null;
  candidates[idx] = { ...candidates[idx], ...updates, id };
  saveCandidates(candidates);
  return candidates[idx];
}

export function ignoreCandidate(id: string): boolean {
  const candidates = getCandidates();
  const idx = candidates.findIndex((c) => c.id === id);
  if (idx === -1) return false;
  candidates[idx] = { ...candidates[idx], status: "ignored" };
  saveCandidates(candidates);
  return true;
}

/** Convertit un candidate en Post et le supprime de la liste. */
export function publishCandidate(id: string): Post | null {
  const candidates = getCandidates();
  const idx = candidates.findIndex((c) => c.id === id);
  if (idx === -1) return null;
  const c = candidates[idx];
  const post = addPost({
    title: c.title,
    date: c.date,
    artist: c.artist,
    link: c.listenLink,
    watchLink: c.watchLink,
    source: c.source,
    image: c.customImage ?? c.image,
  });
  candidates.splice(idx, 1);
  saveCandidates(candidates);
  return post;
}

// =========================================
// Sync Status
// =========================================
export interface SyncStatus {
  lastScan?: string;  // ISO
  errors?: string[];
  perArtist?: Record<string, { ok: boolean; count: number; lastScan?: string }>;
}

function ensureSyncStatusFile(): void {
  if (!fs.existsSync(PATHS.SYNC_STATUS_JSON)) {
    writeJson(PATHS.SYNC_STATUS_JSON, {});
  }
}

export function getSyncStatus(): SyncStatus {
  ensureSyncStatusFile();
  try {
    return readJson<SyncStatus>(PATHS.SYNC_STATUS_JSON);
  } catch {
    return {};
  }
}

export function saveSyncStatus(status: SyncStatus): void {
  writeJson(PATHS.SYNC_STATUS_JSON, status);
}
