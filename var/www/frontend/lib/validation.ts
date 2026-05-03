import { z } from "zod";

// ─── Posts ────────────────────────────────────────────────────────────────────
export const createPostSchema = z.object({
  title: z.string().min(1).max(200),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format de date invalide (YYYY-MM-DD)"),
  artist: z.string().min(1).max(100),
  subtitle: z.string().max(300).optional().default(""),
  link: z.string().url("URL invalide").optional().or(z.literal("")),
  image: z.string().optional().default(""),
});

export const updatePostSchema = createPostSchema.partial().extend({
  id: z.number().int().positive(),
});

// ─── Artists ──────────────────────────────────────────────────────────────────
export const artistProfileSchema = z.object({
  id: z.string().min(1).max(50),
  name: z.string().min(1).max(100),
  glitchName: z.string().max(100).optional(),
  location: z.string().max(100).optional(),
  image: z.string().optional(),
  listenLink: z.string().url().optional().or(z.literal("")),
  watchLink: z.string().url().optional().or(z.literal("")),
  instagramLink: z.string().url().optional().or(z.literal("")),
  latestRelease: z.string().optional(),
  soundcloudUsername: z.string().max(100).optional(),
  youtubeChannelId: z.string().max(50).optional(),
  deezerArtistId: z.string().max(20).optional(),
});

export const saveArtistProfilesSchema = z.array(artistProfileSchema);

// ─── Playlists ────────────────────────────────────────────────────────────────
export const createPlaylistSchema = z.object({
  name: z.string().min(1).max(100).regex(/^[a-zA-Z0-9 _\-]+$/, "Nom de playlist invalide"),
  songs: z.array(z.string().max(255)).optional().default([]),
  color: z.string().max(20).optional(),
  icon: z.string().max(50).optional(),
  cover: z.string().optional(),
});

export const updatePlaylistSchema = z.object({
  name: z.string().min(1).max(100),
  newName: z.string().min(1).max(100).optional(),
  songs: z.array(z.string().max(255)).optional(),
  color: z.string().max(20).optional(),
  icon: z.string().max(50).optional(),
  cover: z.string().optional(),
  schedule: z
    .object({
      enabled: z.boolean(),
      day: z.number().int().min(0).max(6),
      hour: z.number().int().min(0).max(23),
    })
    .optional(),
});

// ─── Music downloads ──────────────────────────────────────────────────────────
export const youtubeDownloadSchema = z.object({
  url: z
    .string()
    .url()
    .refine(
      (u) => u.includes("youtube.com") || u.includes("youtu.be"),
      "URL YouTube invalide"
    ),
});

export const spotifyDownloadSchema = z.object({
  url: z
    .string()
    .url()
    .refine((u) => u.includes("spotify.com"), "URL Spotify invalide"),
});

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const loginSchema = z.object({
  username: z.string().min(1).max(50),
  password: z.string().min(1).max(200),
});

// ─── Helper ───────────────────────────────────────────────────────────────────
export function parseBody<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data);
  if (!result.success) {
    const msg = result.error.issues.map((e) => `${e.path.join(".")}: ${e.message}`).join("; ");
    return { success: false, error: msg };
  }
  return { success: true, data: result.data };
}
