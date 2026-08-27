// =========================================
// SESSION
// =========================================
export interface SessionData {
  logged_in: boolean;
  user_id: string;
  role: "admin" | "artist";
  artist_id: string | null;
}

// =========================================
// USERS
// =========================================
export interface UserRecord {
  password_hash: string;
  role: "admin" | "artist";
  artist_id: string | null;
}

export type UsersJson = Record<string, UserRecord>;

// =========================================
// ARTISTS
// =========================================
export interface ArtistProfile {
  id: string;
  name: string;
  glitchName?: string;
  location?: string;
  image?: string;
  listenLink?: string;
  watchLink?: string;
  instagramLink?: string;
  latestRelease?: {
    title: string;
    coverUrl?: string;
    date?: string;
    link?: string;
  };
  // Sources pour la synchronisation automatique des sorties
  soundcloudUserId?: string;   // ID numérique ex: "98765432" (PAS le slug texte)
  youtubeChannelId?: string;   // format UCxxxxxxxxx
  deezerArtistId?: string;     // format numérique ex: "1234567"
  // Stripe Connect (boutique)
  stripeAccountId?: string;        // acct_xxx du compte connecté de l'artiste
  stripeChargesEnabled?: boolean;  // true quand le compte peut encaisser (onboarding complet)
  stripeDetailsSubmitted?: boolean;// true quand l'artiste a soumis ses infos à Stripe
}

// =========================================
// TIMELINE / POSTS
// =========================================
export interface Post {
  id: number;
  title: string;
  subtitle?: string;
  date: string;
  artist: string;
  link?: string;       // lien d'écoute principal (Spotify, Deezer, Bandcamp…)
  watchLink?: string;  // lien vidéo (YouTube, Vimeo…)
  source?: string;     // "deezer" | "youtube" | "soundcloud" | "manual"
  image?: string;
}

// =========================================
// RELEASE CANDIDATES
// =========================================
export interface ReleaseCandidate {
  id: string;              // hex[:16] de sha256(normalize(artist+":"+title+":"+YYYY-MM))
  title: string;
  artist: string;          // nom exact depuis artists_profiles.json
  date: string;            // YYYY-MM-DD
  image: string;           // URL CDN (Deezer cover_xl, YT thumbnail, SC artwork)
  source: "deezer" | "youtube" | "soundcloud";
  sourceLink: string;      // URL de la release sur la plateforme source
  extraSources?: Array<{ source: "deezer" | "youtube" | "soundcloud"; sourceLink: string }>; // sources supplémentaires (même release, autre plateforme)
  listenLink?: string;     // lien custom (Spotify, Apple Music, Deezer, Bandcamp…)
  watchLink?: string;      // lien vidéo (YouTube, Vimeo…)
  customImage?: string;    // override de l'image source
  status: "pending" | "ignored";
  detectedAt: string;      // ISO date de la première détection
  recordType?: string;     // "album" | "ep" | "single" (Deezer seulement)
}

// =========================================
// RADIO / TRACK
// =========================================
export interface TrackInfo {
  filename: string;
  artist: string;
  title: string;
  start_time: number; // unix timestamp
  duration?: number;
}

export interface CurrentTrackResponse {
  error?: string;
  server_now?: number;
  filename?: string;
  artist?: string;
  title?: string;
  start_time?: number;
  duration?: number;
  elapsed?: number;
  remaining?: number;
}

export interface PlayHistoryRow {
  id: number;
  timestamp: string;
  artist: string;
  title: string;
  listeners_start: number;
}

export interface AudienceLog {
  id: number;
  timestamp: string;
  listeners: number;
  peak_listeners: number;
}

// =========================================
// PLAYLISTS
// =========================================
export interface PlaylistSong {
  filename: string;
  path?: string;
}

export interface PlaylistSchedule {
  enabled: boolean;
  day: number;   // 0=dimanche, 1=lundi … 6=samedi
  hour: number;  // 0-23
}

export interface Playlist {
  name: string;
  songs: string[];
  dir: string;
  color: string;
  icon: string;
  cover: string;
  schedule?: PlaylistSchedule;
}

export interface PlaylistData {
  active_playlist: string | null;
  playlists: Playlist[];
}

// =========================================
// MUSIC FILES
// =========================================
export interface MusicFile {
  filename: string;
  artist?: string;
  title?: string;
  duration?: number;
  coverUrl?: string;
  size?: number;
}

export interface MusicMetadata {
  filename: string;
  artist: string;
  title: string;
  album?: string;
  year?: string;
  duration?: number;
  coverUrl?: string;
  size?: number;
  bpm?: number;
  key?: string;
}

// =========================================
// VST PLUGINS
// =========================================
export interface Vst {
  id: number;
  name: string;
  description: string;
  screenshots: string[];           // relative paths like /uploads/vst_xxx.png or external URLs
  screenshotPositions?: string[];  // object-position per screenshot, e.g. "50% 20%"
  downloadUrl: string;             // external URL or /uploads/vst_xxx.zip
  downloadFilename?: string;       // original filename shown to browser on download
  releaseDate: string;             // YYYY-MM-DD
  version?: string;
}

// =========================================
// API RESPONSE WRAPPER
// =========================================
export interface ApiResponse<T = unknown> {
  status: "success" | "error";
  message?: string;
  data?: T;
}

// =========================================
// SHOP — Products / Tiers / Orders
// =========================================
export type ProductStatus = "draft" | "published";

/** A licence tier of a product (e.g. MP3, WAV, Stems, Exclusif). */
export interface ProductTier {
  id: string;
  product_id: string;
  name: string;              // "MP3" | "WAV" | "Stems" | "Exclusif" | custom
  price_cents: number;       // price in the smallest currency unit (cents)
  license_type?: string;     // free-text licence label
  file_path?: string;        // SERVER-ONLY absolute path inside SHOP_FILES_DIR — never sent to client
  file_name?: string;        // original filename shown to the buyer on download
  is_exclusive: boolean;     // if true, selling it marks the product unavailable
  sort_order: number;
}

/** Public-facing tier (file_path stripped). */
export type PublicProductTier = Omit<ProductTier, "file_path">;

export interface Product {
  id: string;
  artist_id: string;
  title: string;
  description?: string;
  cover_url?: string;
  preview_audio_url?: string; // short teaser/watermarked mp3, web-served
  bpm?: number;
  music_key?: string;
  status: ProductStatus;
  created_at: string;
  updated_at: string;
}

export interface ProductWithTiers extends Product {
  tiers: ProductTier[];
}

export type OrderStatus = "pending" | "paid" | "refunded";

export interface Order {
  id: string;
  stripe_session_id?: string;
  stripe_payment_intent?: string;
  buyer_email?: string;
  amount_total_cents: number;
  currency: string;
  status: OrderStatus;
  created_at: string;
  paid_at?: string;
  discount_code?: string;
  discount_amount_cents?: number;
}

/** One purchased tier — price/share snapshotted at purchase time. */
export interface OrderItem {
  id: string;
  order_id: string;
  product_id?: string;
  tier_id?: string;
  product_title: string;
  tier_name: string;
  artist_id: string;
  price_cents: number;
  artist_share_cents: number;   // price_cents − platform_fee_cents
  platform_fee_cents: number;   // price_cents × commissionPct / 100
}

/** Single-use-ish signed download grant created after payment. */
export interface DownloadToken {
  token: string;
  order_item_id: string;
  expires_at: string;
  max_downloads: number;
  download_count: number;
  created_at: string;
}

/** Editable shop settings (stored in shop_config.json). */
export interface ShopConfig {
  commissionPct: number;   // platform commission, 0-100
  artistsCanSell: boolean; // whether artists can manage their own products
  currency: string;        // ISO currency, lowercase (e.g. "eur")
}

/** Aggregated amount owed to an artist (for the payout ledger). */
export interface ArtistPayout {
  artist_id: string;
  total_share_cents: number;
  total_platform_fee_cents: number;
  order_count: number;
}

/** A single sale row joining orders and order_items, for the admin ledger. */
export interface SaleRow {
  order_id: string;
  paid_at?: string;
  created_at: string;
  buyer_email?: string;
  stripe_session_id?: string;
  stripe_payment_intent?: string;
  status: OrderStatus;
  currency: string;
  product_id?: string;
  product_title: string;
  tier_name: string;
  artist_id: string;
  price_cents: number;
  artist_share_cents: number;
  platform_fee_cents: number;
}

// =========================================
// DISCOUNT CODES
// =========================================
export type DiscountType = "percent" | "fixed";

export interface DiscountCode {
  id: string;
  code: string;             // displayed as-is, matched case-insensitively
  type: DiscountType;
  value: number;            // percent: 1-100 | fixed: cents (e.g. 500 = 5€)
  artist_id?: string;       // null/undefined = global
  max_uses?: number;        // null/undefined = unlimited
  used_count: number;
  expires_at?: string;      // ISO datetime or null
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface DiscountValidationResult {
  valid: boolean;
  message?: string;
  code?: string;
  discount_cents?: number;
  new_price_cents?: number;
  original_price_cents?: number;
  label?: string;           // e.g. "-25% (SUMMER25)"
}

