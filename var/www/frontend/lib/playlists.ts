import fs from "fs";
import path from "path";
import { getPlaylistData, savePlaylistData } from "./data";
import { PATHS } from "./paths";
import { Playlist, PlaylistData, ApiResponse } from "@/types";

function sanitizeDirName(name: string): string {
  return name.replace(/[^A-Za-z0-9_\-]/g, "_");
}

function rrmdir(dir: string): void {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir)) {
    const fullPath = path.join(dir, entry);
    if (fs.lstatSync(fullPath).isDirectory()) rrmdir(fullPath);
    else fs.unlinkSync(fullPath);
  }
  fs.rmdirSync(dir);
}

export function getAllPlaylists(): ApiResponse<PlaylistData> {
  return { status: "success", data: getPlaylistData() };
}

export function createPlaylist(
  name: string,
  songs: string[] = [],
  color = "#6366f1",
  icon = "music",
  cover = ""
): ApiResponse {
  const data = getPlaylistData();

  const duplicate = data.playlists.some(
    (p) => p.name.trim().toLowerCase() === name.trim().toLowerCase()
  );
  if (duplicate) {
    return {
      status: "error",
      message: `Une playlist avec ce nom existe déjà: '${name}'`,
    };
  }

  const dirName = sanitizeDirName(name);
  const playlistPath = path.join(PATHS.PLAYLISTS_DIR, dirName);
  if (!fs.existsSync(playlistPath)) {
    fs.mkdirSync(playlistPath, { recursive: true, mode: 0o777 });
  }

  const newPlaylist: Playlist = { name, songs, dir: dirName, color, icon, cover };
  data.playlists.push(newPlaylist);
  savePlaylistData(data);

  return { status: "success", message: "Playlist créée avec succès." };
}

export function updatePlaylist(
  name: string,
  newSongs: string[],
  newName?: string,
  schedule?: { enabled: boolean; day: number; hour: number } | null
): ApiResponse {
  const data = getPlaylistData();
  const idx = data.playlists.findIndex((p) => p.name === name);
  if (idx === -1) return { status: "error", message: "Playlist introuvable." };

  const playlist = data.playlists[idx];

  if (newName && newName !== name) {
    const duplicate = data.playlists.some(
      (p, i) => i !== idx && p.name.trim().toLowerCase() === newName.trim().toLowerCase()
    );
    if (duplicate) {
      return { status: "error", message: "Ce nom de playlist existe déjà." };
    }
    playlist.name = newName;
  }

  playlist.songs = newSongs;
  if (schedule !== undefined) {
    playlist.schedule = schedule === null ? undefined : schedule;
  }
  savePlaylistData(data);
  return { status: "success", message: "Playlist mise à jour." };
}

export function deletePlaylist(name: string): ApiResponse {
  const data = getPlaylistData();
  const idx = data.playlists.findIndex((p) => p.name === name);
  if (idx === -1) return { status: "error", message: "Playlist introuvable." };

  const playlist = data.playlists[idx];
  const playlistPath = path.join(PATHS.PLAYLISTS_DIR, playlist.dir);
  rrmdir(playlistPath);

  if (data.active_playlist === playlist.dir) {
    data.active_playlist = null;
  }

  data.playlists.splice(idx, 1);
  savePlaylistData(data);
  return { status: "success", message: "Playlist supprimée." };
}

export function setActivePlaylist(name: string | null): ApiResponse {
  const data = getPlaylistData();

  if (name === null) {
    data.active_playlist = null;
    // Point symlink to fallback
    updateLivePlaylistSymlink(null);
    savePlaylistData(data);
    return { status: "success", message: "Playlist active réinitialisée." };
  }

  const playlist = data.playlists.find((p) => p.name === name);
  if (!playlist) return { status: "error", message: "Playlist introuvable." };

  data.active_playlist = playlist.dir;
  savePlaylistData(data);
  updateLivePlaylistSymlink(path.join(PATHS.PLAYLISTS_DIR, playlist.dir));

  return { status: "success", message: `Playlist '${name}' activée.` };
}

function updateLivePlaylistSymlink(target: string | null): void {
  const link = PATHS.LIVE_PLAYLIST_LINK;
  try {
    if (fs.existsSync(link)) fs.unlinkSync(link);
    if (target) fs.symlinkSync(target, link);
  } catch {
    // Symlink operations may fail in dev/Windows environments — non-fatal
  }
}

export function syncFallbackDirectory(): void {
  const fallbackDir = PATHS.FALLBACK_DIR;
  const musicDir = PATHS.MUSIC_DIR;

  if (!fs.existsSync(fallbackDir)) {
    fs.mkdirSync(fallbackDir, { recursive: true, mode: 0o777 });
  }

  const musicFiles = fs.existsSync(musicDir) ? fs.readdirSync(musicDir) : [];
  const fallbackFiles = fs.readdirSync(fallbackDir);

  for (const file of musicFiles) {
    const src = path.join(musicDir, file);
    const lnk = path.join(fallbackDir, file);
    if (fs.statSync(src).isFile() && !fs.existsSync(lnk)) {
      try { fs.symlinkSync(src, lnk); } catch { /* ignore */ }
    }
  }

  for (const file of fallbackFiles) {
    if (!musicFiles.includes(file)) {
      try { fs.unlinkSync(path.join(fallbackDir, file)); } catch { /* ignore */ }
    }
  }
}
