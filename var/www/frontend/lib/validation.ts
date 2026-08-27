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
  stripeAccountId: z.string().max(50).optional(),
  stripeChargesEnabled: z.boolean().optional(),
  stripeDetailsSubmitted: z.boolean().optional(),
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

// ─── Shop ─────────────────────────────────────────────────────────────────────
export const productTierSchema = z.object({
  id: z.string().optional(),                    // present when editing an existing tier
  name: z.string().min(1).max(60),
  price_cents: z.number().int().min(0).max(1_000_000),
  license_type: z.string().max(100).optional(),
  is_exclusive: z.boolean().optional().default(false),
  sort_order: z.number().int().min(0).max(999).optional().default(0),
});

export const createProductSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional().default(""),
  artist_id: z.string().min(1).max(50),
  bpm: z.number().int().min(20).max(400).optional(),
  music_key: z.string().max(10).optional(),
  status: z.enum(["draft", "published"]).optional().default("draft"),
  tiers: z.array(productTierSchema).min(1, "Au moins un palier est requis"),
});

export const updateProductSchema = createProductSchema.partial().extend({
  id: z.string().min(1),
});

export const shopConfigSchema = z.object({
  commissionPct: z.number().min(0).max(100),
  artistsCanSell: z.boolean(),
  currency: z.string().min(3).max(4),
});

export const checkoutSchema = z.object({
  tier_id: z.string().min(1),
  discount_code: z.string().trim().max(60).optional(),
});

// ─── Discount codes ───────────────────────────────────────────────────────────
const discountCodeRegex = /^[A-Za-z0-9_\-]{2,40}$/;

export const discountCreateSchema = z.object({
  code: z.string().trim().regex(discountCodeRegex, "Code: 2-40 caractères alphanumériques, _ ou -"),
  type: z.enum(["percent", "fixed"]),
  value: z.number().int().min(1).max(1_000_000),       // percent ≤100 enforced below
  artist_id: z.string().min(1).max(50).nullable().optional(),
  max_uses: z.number().int().min(1).max(100000).nullable().optional(),
  expires_at: z.string().trim().min(1).nullable().optional(),  // YYYY-MM-DD or YYYY-MM-DD HH:MM:SS
  enabled: z.boolean().optional(),
}).refine((d) => d.type !== "percent" || d.value <= 100, {
  message: "Un pourcentage doit être ≤ 100",
  path: ["value"],
});

export const discountUpdateSchema = z.object({
  code: z.string().trim().regex(discountCodeRegex).optional(),
  type: z.enum(["percent", "fixed"]).optional(),
  value: z.number().int().min(1).max(1_000_000).optional(),
  artist_id: z.string().min(1).max(50).nullable().optional(),
  max_uses: z.number().int().min(1).max(100000).nullable().optional(),
  expires_at: z.string().trim().min(1).nullable().optional(),
  enabled: z.boolean().optional(),
});

export const discountValidateSchema = z.object({
  code: z.string().trim().min(1).max(60),
  tier_id: z.string().min(1),
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
