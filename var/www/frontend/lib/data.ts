import fs from "fs";
import path from "path";
import {
  ArtistProfile,
  Post,
  PlaylistData,
  UsersJson,
  Vst,
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
