import { NextResponse } from "next/server";
import { listProductsWithTiers } from "@/lib/shop";
import { getArtistProfiles } from "@/lib/data";
import type { ProductWithTiers, ArtistProfile } from "@/types";

export interface PublicProduct {
  id: string;
  title: string;
  description?: string;
  cover_url?: string;
  preview_audio_url?: string;
  bpm?: number;
  music_key?: string;
  artist_id: string;
  artist_name: string;
  purchasable: boolean; // artist Stripe account ready to accept charges
  tiers: {
    id: string;
    name: string;
    price_cents: number;
    license_type?: string;
    is_exclusive: boolean;
    sort_order: number;
  }[];
}

export function toPublicProduct(p: ProductWithTiers, profiles: ArtistProfile[]): PublicProduct {
  const profile = profiles.find((a) => a.id === p.artist_id);
  return {
    id: p.id,
    title: p.title,
    description: p.description,
    cover_url: p.cover_url,
    preview_audio_url: p.preview_audio_url,
    bpm: p.bpm,
    music_key: p.music_key,
    artist_id: p.artist_id,
    artist_name: profile?.name ?? p.artist_id,
    purchasable: !!profile?.stripeChargesEnabled,
    tiers: p.tiers
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order || a.price_cents - b.price_cents)
      .map((t) => ({
        id: t.id,
        name: t.name,
        price_cents: t.price_cents,
        license_type: t.license_type,
        is_exclusive: t.is_exclusive,
        sort_order: t.sort_order,
      })),
  };
}

// ─── GET /api/shop/catalog — public list of published products ──────────────────
export async function GET() {
  const profiles = getArtistProfiles();
  const products = listProductsWithTiers({ status: "published" })
    .filter((p) => p.tiers.length > 0)
    .map((p) => toPublicProduct(p, profiles));
  return NextResponse.json({ status: "success", data: products });
}
