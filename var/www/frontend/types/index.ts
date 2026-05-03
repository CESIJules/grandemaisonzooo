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
  link?: string;
  image?: string;
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

export interface Playlist {
  name: string;
  songs: string[];
  dir: string;
  color: string;
  icon: string;
  cover: string;
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
// API RESPONSE WRAPPER
// =========================================
export interface ApiResponse<T = unknown> {
  status: "success" | "error";
  message?: string;
  data?: T;
}
