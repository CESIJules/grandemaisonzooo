"use client";
import { useState, useEffect, useCallback } from "react";
import { usePosts } from "@/hooks/usePosts";
import { useArtists } from "@/hooks/useArtists";
import { useAuth } from "@/hooks/useAuth";
import type { Post, ReleaseCandidate, ArtistProfile } from "@/types";
import styles from "./TimelineTab.module.css";
import tabStyles from "./tab.module.css";

// =============================================
// TOAST SYSTEM
// =============================================
interface Toast {
  id: number;
  message: string;
  type: "success" | "error" | "info";
  undoAction?: () => void;
}

let toastCounter = 0;

function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback(
    (message: string, type: Toast["type"] = "success", undoAction?: () => void) => {
      const id = ++toastCounter;
      setToasts((prev) => [...prev, { id, message, type, undoAction }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, undoAction ? 6000 : 3500);
    },
    []
  );

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, addToast, removeToast };
}

// =============================================
// HELPERS
// =============================================
function formatDate(d: string) {
  if (!d) return "";
  const dt = new Date(d);
  return dt.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

function formatRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `il y a ${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `il y a ${hrs}h`;
  return `il y a ${Math.floor(hrs / 24)}j`;
}

const SOURCE_LABELS: Record<string, string> = {
  deezer: "Deezer",
  youtube: "YouTube",
  soundcloud: "SoundCloud",
};

const SOURCE_COLORS: Record<string, string> = {
  deezer: "#a855f7",
  youtube: "#ef4444",
  soundcloud: "#f97316",
};

const RECORD_TYPE_LABELS: Record<string, string> = {
  album: "ALBUM",
  ep: "EP",
  ep_single: "EP",
  single: "SINGLE",
};

// =============================================
// CANDIDATE CARD
// =============================================
interface CandidateCardProps {
  candidate: ReleaseCandidate;
  selected: boolean;
  onSelect: (id: string, checked: boolean) => void;
  onPublish: (id: string) => void;
  onIgnore: (id: string) => void;
  onUpdate: (id: string, updates: Partial<ReleaseCandidate>) => void;
  onImageClick: (url: string) => void;
  existingPostTitles: Set<string>;
}

function CandidateCard({
  candidate,
  selected,
  onSelect,
  onPublish,
  onIgnore,
  onUpdate,
  onImageClick,
  existingPostTitles,
}: CandidateCardProps) {
  const [listenLink, setListenLink] = useState(candidate.listenLink ?? "");
  const [watchLink, setWatchLink] = useState(candidate.watchLink ?? "");
  const [customImage, setCustomImage] = useState(candidate.customImage ?? "");
  const [imagePreview, setImagePreview] = useState(
    candidate.customImage ?? candidate.image ?? ""
  );
  const [showImageInput, setShowImageInput] = useState(false);

  const displayImage = customImage || candidate.image;
  const color = SOURCE_COLORS[candidate.source] ?? "#888";

  const normTitle = candidate.title.toLowerCase().replace(/[^a-z0-9 ]/g, " ").trim();
  const mayBeDuplicate = existingPostTitles.has(normTitle);

  function handleBlur(field: "listenLink" | "watchLink", value: string) {
    onUpdate(candidate.id, { [field]: value || undefined });
  }

  function applyCustomImage() {
    setImagePreview(customImage);
    onUpdate(candidate.id, { customImage: customImage || undefined });
    setShowImageInput(false);
  }

  return (
    <div
      className={`${styles.card} ${selected ? styles.cardSelected : ""} ${
        candidate.status === "ignored" ? styles.cardIgnored : ""
      }`}
    >
      <div className={styles.cardHeader}>
        <input
          type="checkbox"
          className={styles.cardCheck}
          checked={selected}
          onChange={(e) => onSelect(candidate.id, e.target.checked)}
          aria-label="Sélectionner"
        />
        <div className={styles.cardBadges}>
          {candidate.recordType && RECORD_TYPE_LABELS[candidate.recordType] && (
            <span className={styles.badgeType}>
              {RECORD_TYPE_LABELS[candidate.recordType]}
            </span>
          )}
          <span
            className={styles.badgeSource}
            style={{ background: color + "22", color }}
            title={`Détecté ${formatRelative(candidate.detectedAt)}`}
          >
            {SOURCE_LABELS[candidate.source]}
          </span>
          {candidate.extraSources?.map((extra) => {
            const xColor = SOURCE_COLORS[extra.source] ?? "#888";
            return (
              <span
                key={extra.source}
                className={styles.badgeSource}
                style={{ background: xColor + "22", color: xColor }}
                title={`Aussi sur ${SOURCE_LABELS[extra.source]}`}
              >
                {SOURCE_LABELS[extra.source]}
              </span>
            );
          })}
        </div>
      </div>

      <div className={styles.cardImageWrap}>
        {displayImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imagePreview}
            alt={candidate.title}
            className={styles.cardImage}
            onClick={() => onImageClick(imagePreview)}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <div className={styles.cardImagePlaceholder}>
            <i className="fas fa-music" />
          </div>
        )}
        <button
          className={styles.cardImageOverlay}
          onClick={() => setShowImageInput((v) => !v)}
          title="Changer l'image"
        >
          <i className="fas fa-image" /> Image
        </button>
      </div>

      {showImageInput && (
        <div className={styles.imageEditRow}>
          <input
            type="url"
            className={tabStyles.inputField}
            placeholder="URL de l'image…"
            value={customImage}
            onChange={(e) => setCustomImage(e.target.value)}
          />
          <button className={tabStyles.btnSm} onClick={applyCustomImage}>
            OK
          </button>
        </div>
      )}

      <div className={styles.cardBody}>
        <p className={styles.cardTitle}>{candidate.title}</p>
        <p className={styles.cardMeta}>
          {candidate.artist} · {formatDate(candidate.date)}
        </p>

        {mayBeDuplicate && (
          <p className={styles.dupWarning} title="Un post similaire existe déjà">
            <i className="fas fa-exclamation-triangle" /> Doublon possible
          </p>
        )}

        <a
          href={candidate.sourceLink}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.sourceLink}
        >
          <i className="fas fa-external-link-alt" /> Voir sur {SOURCE_LABELS[candidate.source]}
        </a>

        <label className={styles.linkLabel}>
          <i className="fas fa-headphones" /> Lien écouter
          <input
            type="url"
            className={tabStyles.inputField}
            placeholder="https://spotify.com/…"
            value={listenLink}
            onChange={(e) => setListenLink(e.target.value)}
            onBlur={() => handleBlur("listenLink", listenLink)}
          />
        </label>

        <label className={styles.linkLabel}>
          <i className="fas fa-play-circle" /> Lien regarder
          <input
            type="url"
            className={tabStyles.inputField}
            placeholder="https://youtu.be/…"
            value={watchLink}
            onChange={(e) => setWatchLink(e.target.value)}
            onBlur={() => handleBlur("watchLink", watchLink)}
          />
        </label>
      </div>

      <div className={styles.cardActions}>
        <button className={styles.btnPublish} onClick={() => onPublish(candidate.id)}>
          <i className="fas fa-check" /> Publier
        </button>
        <button className={styles.btnIgnore} onClick={() => onIgnore(candidate.id)}>
          <i className="fas fa-times" /> Ignorer
        </button>
      </div>
    </div>
  );
}

// =============================================
// POST ROW
// =============================================
interface PostRowProps {
  post: Post;
  artistOptions: ArtistProfile[];
  onDelete: (id: number) => void;
  onSave: (id: number, updates: Partial<Post>) => void;
}

function PostRow({ post, artistOptions, onDelete, onSave }: PostRowProps) {
  const [expanded, setExpanded] = useState(false);
  const [form, setForm] = useState<Partial<Post>>({
    title: post.title,
    subtitle: post.subtitle ?? "",
    date: post.date,
    artist: post.artist,
    link: post.link ?? "",
    watchLink: post.watchLink ?? "",
    image: post.image ?? "",
  });

  const sourceColor = post.source ? SOURCE_COLORS[post.source] ?? "#888" : undefined;

  function field(k: keyof Post, v: string) {
    setForm((prev) => ({ ...prev, [k]: v }));
  }

  return (
    <div className={styles.postRow}>
      <div className={styles.postRowMain}>
        {post.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.image}
            alt={post.title}
            className={styles.postThumb}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <div className={styles.postThumbEmpty}>
            <i className="fas fa-music" />
          </div>
        )}

        <div className={styles.postRowInfo}>
          <span className={styles.postRowTitle}>{post.title}</span>
          <span className={styles.postRowMeta}>
            {post.artist} · {formatDate(post.date)}
            {post.source && (
              <span className={styles.postSourceTag} style={{ color: sourceColor }}>
                {" · "}
                {SOURCE_LABELS[post.source] ?? post.source}
              </span>
            )}
          </span>
          <span className={styles.postRowLinks}>
            {post.link && (
              <a
                href={post.link}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.postLink}
              >
                <i className="fas fa-headphones" /> Écouter
              </a>
            )}
            {post.watchLink && (
              <a
                href={post.watchLink}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.postLink}
              >
                <i className="fas fa-play-circle" /> Regarder
              </a>
            )}
          </span>
        </div>

        <div className={styles.postRowBtns}>
          <button
            className={tabStyles.btnSm}
            onClick={() => setExpanded((v) => !v)}
            title="Modifier"
          >
            <i className={`fas fa-${expanded ? "chevron-up" : "pen"}`} />
          </button>
          <button className={tabStyles.btnDanger} onClick={() => onDelete(post.id)} title="Supprimer">
            <i className="fas fa-trash" />
          </button>
        </div>
      </div>

      {expanded && (
        <div className={styles.postEditPanel}>
          <div className={tabStyles.grid2}>
            <label className={tabStyles.label}>
              Titre *
              <input
                className={tabStyles.inputField}
                value={form.title ?? ""}
                onChange={(e) => field("title", e.target.value)}
              />
            </label>
            <label className={tabStyles.label}>
              Sous-titre
              <input
                className={tabStyles.inputField}
                value={form.subtitle ?? ""}
                onChange={(e) => field("subtitle", e.target.value)}
              />
            </label>
            <label className={tabStyles.label}>
              Date *
              <input
                type="date"
                className={tabStyles.inputField}
                value={form.date ?? ""}
                onChange={(e) => field("date", e.target.value)}
              />
            </label>
            <label className={tabStyles.label}>
              Artiste *
              <select
                className={tabStyles.inputField}
                value={form.artist ?? ""}
                onChange={(e) => field("artist", e.target.value)}
              >
                {artistOptions.map((a) => (
                  <option key={a.id} value={a.name}>
                    {a.name}
                  </option>
                ))}
              </select>
            </label>
            <label className={tabStyles.label}>
              Lien écouter
              <input
                type="url"
                className={tabStyles.inputField}
                placeholder="https://…"
                value={form.link ?? ""}
                onChange={(e) => field("link", e.target.value)}
              />
            </label>
            <label className={tabStyles.label}>
              Lien regarder
              <input
                type="url"
                className={tabStyles.inputField}
                placeholder="https://…"
                value={form.watchLink ?? ""}
                onChange={(e) => field("watchLink", e.target.value)}
              />
            </label>
            <label className={tabStyles.label} style={{ gridColumn: "1 / -1" }}>
              Image (URL)
              <input
                type="url"
                className={tabStyles.inputField}
                placeholder="https://…"
                value={form.image ?? ""}
                onChange={(e) => field("image", e.target.value)}
              />
            </label>
          </div>
          <div className={tabStyles.row} style={{ marginTop: "0.75rem" }}>
            <button
              className="btn btn-primary"
              onClick={() => {
                onSave(post.id, form);
                setExpanded(false);
              }}
            >
              <i className="fas fa-save" /> Enregistrer
            </button>
            <button className="btn btn-secondary" onClick={() => setExpanded(false)}>
              Annuler
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================
// ADD POST FORM
// =============================================
interface AddPostFormProps {
  artistOptions: ArtistProfile[];
  onSave: (data: Omit<Post, "id">) => void;
  onCancel: () => void;
}

function AddPostForm({ artistOptions, onSave, onCancel }: AddPostFormProps) {
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    title: "",
    subtitle: "",
    date: today,
    artist: artistOptions[0]?.name ?? "",
    link: "",
    watchLink: "",
    image: "",
  });

  function field(k: string, v: string) {
    setForm((prev) => ({ ...prev, [k]: v }));
  }

  return (
    <div className={styles.addPostForm}>
      <h3 className={styles.addPostTitle}>Nouveau post manuel</h3>
      <div className={tabStyles.grid2}>
        <label className={tabStyles.label}>
          Titre *
          <input
            className={tabStyles.inputField}
            value={form.title}
            onChange={(e) => field("title", e.target.value)}
            autoFocus
          />
        </label>
        <label className={tabStyles.label}>
          Sous-titre
          <input
            className={tabStyles.inputField}
            value={form.subtitle}
            onChange={(e) => field("subtitle", e.target.value)}
          />
        </label>
        <label className={tabStyles.label}>
          Date *
          <input
            type="date"
            className={tabStyles.inputField}
            value={form.date}
            onChange={(e) => field("date", e.target.value)}
          />
        </label>
        <label className={tabStyles.label}>
          Artiste *
          <select
            className={tabStyles.inputField}
            value={form.artist}
            onChange={(e) => field("artist", e.target.value)}
          >
            {artistOptions.map((a) => (
              <option key={a.id} value={a.name}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
        <label className={tabStyles.label}>
          Lien écouter
          <input
            type="url"
            className={tabStyles.inputField}
            placeholder="https://…"
            value={form.link}
            onChange={(e) => field("link", e.target.value)}
          />
        </label>
        <label className={tabStyles.label}>
          Lien regarder
          <input
            type="url"
            className={tabStyles.inputField}
            placeholder="https://…"
            value={form.watchLink}
            onChange={(e) => field("watchLink", e.target.value)}
          />
        </label>
        <label className={tabStyles.label} style={{ gridColumn: "1 / -1" }}>
          Image (URL)
          <input
            type="url"
            className={tabStyles.inputField}
            placeholder="https://…"
            value={form.image}
            onChange={(e) => field("image", e.target.value)}
          />
        </label>
      </div>
      <div className={tabStyles.row} style={{ marginTop: "0.75rem" }}>
        <button
          className="btn btn-primary"
          disabled={!form.title || !form.date || !form.artist}
          onClick={() =>
            onSave({
              title: form.title,
              subtitle: form.subtitle || undefined,
              date: form.date,
              artist: form.artist,
              link: form.link || undefined,
              watchLink: form.watchLink || undefined,
              image: form.image || undefined,
              source: "manual",
            })
          }
        >
          <i className="fas fa-plus" /> Créer
        </button>
        <button className="btn btn-secondary" onClick={onCancel}>
          Annuler
        </button>
      </div>
    </div>
  );
}

// =============================================
// SOURCE CARD
// =============================================
interface SourceCardProps {
  artist: ArtistProfile;
  postCount: number;
  syncOk?: boolean;
  lastScan?: string;
  onSave: (artist: ArtistProfile) => void;
  onTest: (artistId: string) => Promise<void>;
}

function SourceCard({ artist, postCount, syncOk, lastScan, onSave, onTest }: SourceCardProps) {
  const [form, setForm] = useState({
    deezerArtistId: artist.deezerArtistId ?? "",
    youtubeChannelId: artist.youtubeChannelId ?? "",
    soundcloudUserId: artist.soundcloudUserId ?? "",
  });
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testOpen, setTestOpen] = useState(false);

  function handleBlur() {
    onSave({
      ...artist,
      deezerArtistId: form.deezerArtistId || undefined,
      youtubeChannelId: form.youtubeChannelId || undefined,
      soundcloudUserId: form.soundcloudUserId || undefined,
    });
  }

  async function handleTest() {
    setTesting(true);
    setTestResult(null);
    setTestOpen(true);
    try {
      await onTest(artist.id);
      setTestResult("Scan terminé. Vérifiez l'onglet Sorties détectées.");
    } catch (err) {
      setTestResult(`Erreur: ${String(err)}`);
    } finally {
      setTesting(false);
    }
  }

  const configured = [
    form.deezerArtistId && "Deezer",
    form.youtubeChannelId && "YouTube",
    form.soundcloudUserId && "SoundCloud",
  ].filter(Boolean);

  return (
    <div className={styles.sourceCard}>
      <div className={styles.sourceCardHeader}>
        <div className={styles.sourceArtistName}>
          <span
            className={styles.sourceStatusDot}
            style={{
              background:
                lastScan === undefined ? "#555" : syncOk ? "#22c55e" : "#ef4444",
            }}
            title={
              lastScan === undefined
                ? "Jamais scanné"
                : syncOk
                ? `Dernier scan OK — ${formatRelative(lastScan)}`
                : "Erreur lors du dernier scan"
            }
          />
          {artist.name}
          <span className={styles.sourcePostCount}>{postCount} posts</span>
        </div>
        <div className={tabStyles.row}>
          {configured.length > 0 && (
            <span className={styles.sourcesConfigured}>{configured.join(" · ")}</span>
          )}
          <button
            className={tabStyles.btnSm}
            onClick={handleTest}
            disabled={testing || configured.length === 0}
          >
            {testing ? (
              <>
                <i className="fas fa-spinner fa-spin" /> Scan…
              </>
            ) : (
              <>
                <i className="fas fa-sync-alt" /> Tester
              </>
            )}
          </button>
        </div>
      </div>

      <div className={tabStyles.grid2}>
        <label className={tabStyles.label}>
          Deezer Artist ID
          <input
            className={tabStyles.inputField}
            placeholder="1234567"
            value={form.deezerArtistId}
            onChange={(e) => setForm((f) => ({ ...f, deezerArtistId: e.target.value }))}
            onBlur={handleBlur}
          />
        </label>
        <label className={tabStyles.label}>
          YouTube Channel ID
          <input
            className={tabStyles.inputField}
            placeholder="UCxxxxxxxxxxxxxxxxxx"
            value={form.youtubeChannelId}
            onChange={(e) => setForm((f) => ({ ...f, youtubeChannelId: e.target.value }))}
            onBlur={handleBlur}
          />
        </label>
        <label className={tabStyles.label}>
          SoundCloud User ID{" "}
          <span
            className={styles.helpTooltip}
            title="ID numérique (pas le slug texte). Trouvable via l'API SoundCloud ou onlinesocialtools.com"
          >
            <i className="fas fa-question-circle" />
          </span>
          <input
            className={tabStyles.inputField}
            placeholder="98765432"
            value={form.soundcloudUserId}
            onChange={(e) => setForm((f) => ({ ...f, soundcloudUserId: e.target.value }))}
            onBlur={handleBlur}
          />
        </label>
      </div>

      {testOpen && (
        <div className={styles.testAccordion}>
          <button
            className={styles.testAccordionHeader}
            onClick={() => setTestOpen((v) => !v)}
          >
            <i className={`fas fa-chevron-${testOpen ? "up" : "down"}`} /> Résultats du test
          </button>
          <p className={styles.testResult}>
            {testing ? (
              <>
                <i className="fas fa-spinner fa-spin" /> Scan en cours…
              </>
            ) : (
              testResult ?? "—"
            )}
          </p>
        </div>
      )}
    </div>
  );
}

// =============================================
// LIGHTBOX
// =============================================
function Lightbox({ src, onClose }: { src: string; onClose: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div className={styles.lightboxOverlay} onClick={onClose}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        className={styles.lightboxImg}
        onClick={(e) => e.stopPropagation()}
      />
      <button className={styles.lightboxClose} onClick={onClose}>
        <i className="fas fa-times" />
      </button>
    </div>
  );
}

// =============================================
// MAIN COMPONENT
// =============================================
type InnerTab = "candidates" | "posts" | "sources";

interface SyncStatusState {
  lastScan?: string;
  errors?: string[];
  perArtist?: Record<string, { ok: boolean; count: number; lastScan?: string }>;
}

export default function TimelineTab() {
  const { posts, loading: postsLoading, refresh: refreshPosts } = usePosts();
  const { artists, loading: artistsLoading, refresh: refreshArtists } = useArtists();
  const { toasts, addToast, removeToast } = useToasts();
  const { isAdmin, isArtist, auth } = useAuth();

  // Artists are restricted to managing only their own posts → start on "Publiés"
  const [innerTab, setInnerTab] = useState<InnerTab>(isArtist ? "posts" : "candidates");
  const ownArtist = isArtist ? artists.find((a) => a.id === auth?.artist_id) : null;
  const artistOptionsForArtist = ownArtist ? [ownArtist] : [];
  const [candidates, setCandidates] = useState<ReleaseCandidate[]>([]);
  const [candidatesLoading, setCandidatesLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<SyncStatusState>({});
  const [showIgnored, setShowIgnored] = useState(false);

  const [filterSource, setFilterSource] = useState("all");
  const [filterArtistId, setFilterArtistId] = useState("all");
  const [search, setSearch] = useState("");

  const [postSearch, setPostSearch] = useState("");
  const [postFilterSource, setPostFilterSource] = useState("all");
  const [postFilterArtist, setPostFilterArtist] = useState("all");

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [scanning, setScanning] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [showAddPost, setShowAddPost] = useState(false);

  const fetchCandidates = useCallback(async () => {
    setCandidatesLoading(true);
    try {
      const res = await fetch("/api/releases/candidates?status=all");
      const data = await res.json();
      if (data.status === "success") setCandidates(data.candidates);
    } finally {
      setCandidatesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCandidates();
  }, [fetchCandidates]);

  async function handleScan() {
    setScanning(true);
    try {
      const res = await fetch("/api/releases/scan", { method: "POST" });
      const data = await res.json();
      if (data.status === "success") {
        addToast(`Scan terminé — ${data.new} nouvelles sorties détectées`, "success");
        await fetchCandidates();
        setSyncStatus((s) => ({ ...s, lastScan: new Date().toISOString() }));
      } else {
        addToast("Erreur lors du scan", "error");
      }
    } catch {
      addToast("Erreur de connexion.", "error");
    } finally {
      setScanning(false);
    }
  }

  async function handleTestArtist(artistId: string) {
    const res = await fetch(`/api/releases/scan?artist=${encodeURIComponent(artistId)}`, {
      method: "POST",
    });
    const data = await res.json();
    if (data.status === "success") {
      await fetchCandidates();
    }
  }

  async function handlePublish(id: string) {
    const candidate = candidates.find((c) => c.id === id);
    const res = await fetch(`/api/releases/candidates/${id}/publish`, { method: "POST" });
    const data = await res.json();
    if (data.status === "success") {
      const title = candidate?.title ?? "Post";
      const postId = data.post?.id;
      setCandidates((prev) => prev.filter((c) => c.id !== id));
      refreshPosts();
      addToast(`"${title}" publié`, "success", postId ? async () => {
        await fetch(`/api/posts/${postId}`, { method: "DELETE" });
        refreshPosts();
        await fetchCandidates();
        addToast("Publication annulée", "info");
      } : undefined);
    } else {
      addToast(`Erreur: ${data.message}`, "error");
    }
  }

  async function handleIgnore(id: string) {
    const res = await fetch(`/api/releases/candidates/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (data.status === "success") {
      setCandidates((prev) =>
        prev.map((c) => (c.id === id ? { ...c, status: "ignored" } : c))
      );
      addToast("Release ignorée", "info");
    }
  }

  async function handleCandidateUpdate(id: string, updates: Partial<ReleaseCandidate>) {
    const res = await fetch(`/api/releases/candidates/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    const data = await res.json();
    if (data.status === "success") {
      setCandidates((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
    }
  }

  async function handleBulkAction(action: "publish" | "ignore") {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;
    const res = await fetch("/api/releases/candidates/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ids }),
    });
    const data = await res.json();
    if (data.status === "success") {
      setSelectedIds(new Set());
      addToast(
        `${data.processed} release(s) ${action === "publish" ? "publiée(s)" : "ignorée(s)"}`,
        "success"
      );
      await fetchCandidates();
      if (action === "publish") refreshPosts();
    } else {
      addToast("Erreur lors de l'action.", "error");
    }
  }

  function handleSelectToggle(id: string, checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function handleSelectAll(visible: ReleaseCandidate[]) {
    if (selectedIds.size === visible.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(visible.map((c) => c.id)));
    }
  }

  async function handleDeletePost(id: number) {
    const post = posts.find((p) => p.id === id);
    if (!confirm(`Supprimer "${post?.title}" ?`)) return;
    await fetch(`/api/posts/${id}`, { method: "DELETE" });
    refreshPosts();
    addToast("Post supprimé", "info");
  }

  async function handleSavePost(id: number, updates: Partial<Post>) {
    const res = await fetch(`/api/posts/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    const data = await res.json();
    if (data.status === "success") {
      refreshPosts();
      addToast("Post mis à jour", "success");
    } else {
      addToast(`Erreur: ${data.message}`, "error");
    }
  }

  async function handleAddPost(postData: Omit<Post, "id">) {
    const res = await fetch("/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(postData),
    });
    const data = await res.json();
    if (data.status === "success") {
      setShowAddPost(false);
      refreshPosts();
      addToast(`"${postData.title}" ajouté`, "success");
    } else {
      addToast(`Erreur: ${data.message}`, "error");
    }
  }

  async function handleSaveArtistSources(updated: ArtistProfile) {
    const newList = artists.map((a) => (a.id === updated.id ? updated : a));
    const res = await fetch("/api/artists/profiles", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newList),
    });
    const data = await res.json();
    if (data.status !== "success") {
      addToast(`Erreur: ${data.message}`, "error");
    } else {
      refreshArtists();
    }
  }

  // Derived state
  const pendingCandidates = candidates.filter((c) => c.status === "pending");
  const ignoredCandidates = candidates.filter((c) => c.status === "ignored");

  const visibleCandidates = (showIgnored ? ignoredCandidates : pendingCandidates).filter((c) => {
    if (filterSource !== "all" && c.source !== filterSource) return false;
    if (filterArtistId !== "all") {
      const a = artists.find((x) => x.id === filterArtistId);
      if (a && c.artist !== a.name) return false;
    }
    if (search) {
      const q = search.toLowerCase();
      if (!c.title.toLowerCase().includes(q) && !c.artist.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const visiblePosts = posts.filter((p) => {
    // Artists can only see their own posts
    if (isArtist) {
      if (!ownArtist || p.artist.toLowerCase() !== ownArtist.name.toLowerCase()) return false;
    }
    if (postFilterSource !== "all") {
      if (!p.source || p.source !== postFilterSource) return false;
    }
    if (postFilterArtist !== "all") {
      const a = artists.find((x) => x.id === postFilterArtist);
      if (a && p.artist !== a.name) return false;
    }
    if (postSearch) {
      const q = postSearch.toLowerCase();
      if (!p.title.toLowerCase().includes(q) && !p.artist.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const existingPostTitles = new Set(
    posts.map((p) =>
      p.title
        .toLowerCase()
        .replace(/[^a-z0-9 ]/g, " ")
        .trim()
    )
  );

  const configuredArtistsCount = artists.filter(
    (a) => a.deezerArtistId || a.youtubeChannelId || a.soundcloudUserId
  ).length;

  const postCountByArtist: Record<string, number> = {};
  for (const post of posts) {
    const a = artists.find((x) => x.name === post.artist);
    if (a) postCountByArtist[a.id] = (postCountByArtist[a.id] ?? 0) + 1;
  }

  // Find latest detectedAt from candidates for the lastScan display
  const latestDetected =
    candidates.length > 0
      ? candidates.reduce((acc, c) =>
          new Date(c.detectedAt) > new Date(acc) ? c.detectedAt : acc,
          candidates[0].detectedAt
        )
      : undefined;

  return (
    <div className={tabStyles.tab}>
      {/* Header */}
      <div className={tabStyles.rowBetween}>
        <div>
          <h2 className={tabStyles.tabTitle}>Timeline</h2>
          <p className={styles.headerMeta}>
            {latestDetected
              ? `Dernière détection: ${formatRelative(latestDetected)}`
              : "Jamais scanné"}
            {" · "}
            {configuredArtistsCount} artiste{configuredArtistsCount !== 1 ? "s" : ""} configuré
            {configuredArtistsCount !== 1 ? "s" : ""}
            {isAdmin && pendingCandidates.length > 0 && (
              <>
                {" · "}
                <span className={styles.pendingBadge}>{pendingCandidates.length} en attente</span>
              </>
            )}
          </p>
        </div>
        {isAdmin && (
          <button className="btn btn-primary" onClick={handleScan} disabled={scanning}>
            {scanning ? (
              <>
                <i className="fas fa-spinner fa-spin" /> Scan en cours…
              </>
            ) : (
              <>
                <i className="fas fa-sync-alt" /> Scanner maintenant
              </>
            )}
          </button>
        )}
      </div>

      {/* Inner tabs */}
      <div className={styles.innerTabBar}>
        {isAdmin && (
          <button
            className={`${styles.innerTab} ${innerTab === "candidates" ? styles.innerTabActive : ""}`}
            onClick={() => setInnerTab("candidates")}
          >
            Sorties détectées
            {pendingCandidates.length > 0 && (
              <span className={styles.tabBadge}>{pendingCandidates.length}</span>
            )}
          </button>
        )}
        <button
          className={`${styles.innerTab} ${innerTab === "posts" ? styles.innerTabActive : ""}`}
          onClick={() => setInnerTab("posts")}
        >
          Publiés
          <span className={styles.tabBadgeGray}>{isArtist ? visiblePosts.length : posts.length}</span>
        </button>
        {isAdmin && (
          <button
            className={`${styles.innerTab} ${innerTab === "sources" ? styles.innerTabActive : ""}`}
            onClick={() => setInnerTab("sources")}
          >
            Sources
          </button>
        )}
      </div>

      {/* ── Sorties détectées ── */}
      {innerTab === "candidates" && (
        <div>
          <div className={`${tabStyles.rowBetween} ${styles.filterBar}`}>
            <div className={tabStyles.row}>
              {(["all", "deezer", "youtube", "soundcloud"] as const).map((s) => (
                <button
                  key={s}
                  className={`${styles.filterBtn} ${filterSource === s ? styles.filterBtnActive : ""}`}
                  onClick={() => setFilterSource(s)}
                >
                  {s === "all" ? "Tous" : SOURCE_LABELS[s]}
                </button>
              ))}
            </div>
            <div className={tabStyles.row}>
              <select
                className={tabStyles.inputField}
                style={{ width: "auto", fontSize: "0.8rem" }}
                value={filterArtistId}
                onChange={(e) => setFilterArtistId(e.target.value)}
              >
                <option value="all">Tous les artistes</option>
                {artists.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
              <div className={styles.searchBox}>
                <i className="fas fa-search" />
                <input
                  type="text"
                  placeholder="Rechercher…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className={styles.searchInput}
                />
              </div>
            </div>
          </div>

          {candidatesLoading && (
            <p className={styles.emptyMsg}>
              <i className="fas fa-spinner fa-spin" /> Chargement…
            </p>
          )}

          {!candidatesLoading && visibleCandidates.length === 0 && (
            <div className={styles.emptyState}>
              <i className="fas fa-music" />
              <p>
                {showIgnored
                  ? "Aucune sortie ignorée."
                  : "Aucune sortie en attente. Lance un scan pour en détecter."}
              </p>
            </div>
          )}

          {!candidatesLoading && visibleCandidates.length > 0 && (
            <>
              <div className={styles.selectAllRow}>
                <label className={styles.selectAllLabel}>
                  <input
                    type="checkbox"
                    checked={
                      visibleCandidates.length > 0 &&
                      visibleCandidates.every((c) => selectedIds.has(c.id))
                    }
                    onChange={() => handleSelectAll(visibleCandidates)}
                  />
                  {visibleCandidates.every((c) => selectedIds.has(c.id)) && visibleCandidates.length > 0
                    ? "Tout désélectionner"
                    : "Tout sélectionner"}
                </label>
                <span className={styles.countLabel}>{visibleCandidates.length} sorties</span>
              </div>

              <div className={styles.cardsGrid}>
                {visibleCandidates.map((c) => (
                  <CandidateCard
                    key={c.id}
                    candidate={c}
                    selected={selectedIds.has(c.id)}
                    onSelect={handleSelectToggle}
                    onPublish={handlePublish}
                    onIgnore={handleIgnore}
                    onUpdate={handleCandidateUpdate}
                    onImageClick={setLightboxSrc}
                    existingPostTitles={existingPostTitles}
                  />
                ))}
              </div>
            </>
          )}

          <div className={styles.toggleIgnored}>
            <button
              className={styles.toggleIgnoredBtn}
              onClick={() => setShowIgnored((v) => !v)}
            >
              {showIgnored ? (
                <>
                  <i className="fas fa-chevron-up" /> Masquer les ignorées (
                  {ignoredCandidates.length})
                </>
              ) : (
                <>
                  <i className="fas fa-chevron-down" /> Voir les ignorées (
                  {ignoredCandidates.length})
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ── Publiés ── */}
      {innerTab === "posts" && (
        <div>
          <div className={`${tabStyles.rowBetween} ${styles.filterBar}`}>
            <button className="btn btn-primary" onClick={() => setShowAddPost((v) => !v)}>
              <i className="fas fa-plus" /> Nouveau post manuel
            </button>
            <div className={tabStyles.row}>
              <select
                className={tabStyles.inputField}
                style={{ width: "auto", fontSize: "0.8rem" }}
                value={postFilterSource}
                onChange={(e) => setPostFilterSource(e.target.value)}
              >
                <option value="all">Toutes les sources</option>
                <option value="deezer">Deezer</option>
                <option value="youtube">YouTube</option>
                <option value="soundcloud">SoundCloud</option>
                <option value="manual">Manuel</option>
              </select>
              <select
                className={tabStyles.inputField}
                style={{ width: "auto", fontSize: "0.8rem" }}
                value={postFilterArtist}
                onChange={(e) => setPostFilterArtist(e.target.value)}
              >
                <option value="all">Tous les artistes</option>
                {artists.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
              <div className={styles.searchBox}>
                <i className="fas fa-search" />
                <input
                  type="text"
                  placeholder="Rechercher…"
                  value={postSearch}
                  onChange={(e) => setPostSearch(e.target.value)}
                  className={styles.searchInput}
                />
              </div>
            </div>
          </div>

          {showAddPost && (
            <AddPostForm
              artistOptions={isArtist ? artistOptionsForArtist : artists}
              onSave={handleAddPost}
              onCancel={() => setShowAddPost(false)}
            />
          )}

          {postsLoading && (
            <p className={styles.emptyMsg}>
              <i className="fas fa-spinner fa-spin" /> Chargement…
            </p>
          )}

          {!postsLoading && visiblePosts.length === 0 && (
            <div className={styles.emptyState}>
              <i className="fas fa-newspaper" />
              <p>Aucun post publié.</p>
            </div>
          )}

          <div className={styles.postList}>
            {visiblePosts.map((p) => (
              <PostRow
                key={p.id}
                post={p}
                artistOptions={isArtist ? artistOptionsForArtist : artists}
                onDelete={handleDeletePost}
                onSave={handleSavePost}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Sources ── */}
      {innerTab === "sources" && (
        <div>
          <div className={tabStyles.rowBetween} style={{ marginBottom: "1rem" }}>
            <p className={styles.sourcesNote}>
              Sauvegarde automatique au départ du champ. SoundCloud nécessite l&apos;ID numérique.
            </p>
            <button className="btn btn-primary" onClick={handleScan} disabled={scanning}>
              {scanning ? (
                <>
                  <i className="fas fa-spinner fa-spin" /> Scan en cours…
                </>
              ) : (
                <>
                  <i className="fas fa-sync-alt" /> Scanner tous
                </>
              )}
            </button>
          </div>
          {artistsLoading ? (
            <p className={styles.emptyMsg}>
              <i className="fas fa-spinner fa-spin" /> Chargement…
            </p>
          ) : (
            <div className={styles.sourceCardList}>
              {artists.map((a) => (
                <SourceCard
                  key={a.id}
                  artist={a}
                  postCount={postCountByArtist[a.id] ?? 0}
                  syncOk={syncStatus.perArtist?.[a.id]?.ok}
                  lastScan={syncStatus.perArtist?.[a.id]?.lastScan}
                  onSave={handleSaveArtistSources}
                  onTest={handleTestArtist}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Bulk bar (sticky) */}
      {innerTab === "candidates" && selectedIds.size > 0 && (
        <div className={styles.bulkBar}>
          <span>{selectedIds.size} sélectionné(s)</span>
          <div className={tabStyles.row}>
            <button className="btn btn-primary" onClick={() => handleBulkAction("publish")}>
              <i className="fas fa-check" /> Publier ({selectedIds.size})
            </button>
            <button className={tabStyles.btnSm} onClick={() => handleBulkAction("ignore")}>
              <i className="fas fa-ban" /> Ignorer ({selectedIds.size})
            </button>
            <button className={tabStyles.btnSm} onClick={() => setSelectedIds(new Set())}>
              Désélectionner
            </button>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightboxSrc && (
        <Lightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
      )}

      {/* Toasts */}
      <div className={styles.toastContainer}>
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`${styles.toast} ${
              t.type === "error"
                ? styles.toastError
                : t.type === "info"
                ? styles.toastInfo
                : styles.toastSuccess
            }`}
          >
            <span>{t.message}</span>
            <div className={tabStyles.row}>
              {t.undoAction && (
                <button
                  className={styles.toastUndo}
                  onClick={() => {
                    t.undoAction!();
                    removeToast(t.id);
                  }}
                >
                  Annuler
                </button>
              )}
              <button className={styles.toastClose} onClick={() => removeToast(t.id)}>
                <i className="fas fa-times" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


