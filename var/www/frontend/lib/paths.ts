// Centralised filesystem paths — all server paths in one place.
// In production DATA_ROOT is unset (paths are absolute Linux paths).
// In local dev set DATA_ROOT in .env.local to the monorepo root.

const ROOT = (process.env.DATA_ROOT ?? "").replace(/[/\\]+$/, "");

export const PATHS = {
  // Data files (live in var/www/frontend/data/ — written by Next.js API routes)
  USERS_JSON: `${ROOT}/var/www/users.json`,
  ARTISTS_JSON: `${ROOT}/var/www/frontend/data/artists.json`,
  ARTISTS_PROFILES_JSON: `${ROOT}/var/www/frontend/data/artists_profiles.json`,
  TIMELINE_JSON: `${ROOT}/var/www/frontend/data/timeline.json`,
  PLAYLIST_JSON: `${ROOT}/var/www/frontend/data/playlist.json`,

  // VST plugins data
  VSTS_JSON: `${ROOT}/var/www/frontend/data/vsts.json`,

  // Analytics DB
  ANALYTICS_DB: `${ROOT}/var/www/data/analytics.db`,

  // Music / Radio
  MUSIC_DIR: `${ROOT}/home/radio/musique`,
  PLAYLISTS_DIR: `${ROOT}/home/radio/playlists`,
  LIVE_PLAYLIST_LINK: `${ROOT}/home/radio/live-playlist`,
  FALLBACK_DIR: `${ROOT}/home/radio/fallback`,

  // Uploads (web-accessible via /uploads/ — served by nginx from html/uploads/)
  UPLOADS_DIR: `${ROOT}/var/www/html/uploads`,
  ARTISTS_UPLOADS_DIR: `${ROOT}/var/www/html/uploads/artists`,

  // Track info temp file written by Liquidsoap via log_track.php
  TRACK_INFO_TMP: "/tmp/radio_track_info.json",
  DURATION_CACHE_TMP: "/tmp/radio_duration_cache.json",

  // Pre-computed music metadata (written by Python analyze scripts)
  MUSIC_METADATA_JSON: `${ROOT}/var/www/html/music_metadata.json`,

  // Liquidsoap telnet
  LIQUIDSOAP_HOST: "127.0.0.1",
  LIQUIDSOAP_PORT: 1234,

  // Icecast buffer delay in seconds
  ICECAST_BUFFER_DELAY: 16,
} as const;
