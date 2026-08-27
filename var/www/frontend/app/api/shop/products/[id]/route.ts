import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  getProduct,
  getProductWithTiers,
  updateProduct,
  deleteProduct,
  listTiers,
  createTier,
  updateTier,
  deleteTier,
  getShopConfig,
} from "@/lib/shop";
import { savePublicAsset, saveDeliverable } from "@/lib/uploads";
import type { ProductStatus, SessionData } from "@/types";

interface TierMeta {
  id?: string;
  name: string;
  price_cents: number;
  license_type?: string;
  is_exclusive?: boolean;
  sort_order?: number;
}

/** Returns null if allowed, or a NextResponse to short-circuit. */
async function authorize(
  productArtistId: string,
  session: SessionData
): Promise<NextResponse | null> {
  if (!session.logged_in) {
    return NextResponse.json({ status: "error", message: "Non autorisé" }, { status: 401 });
  }
  if (session.role === "admin") return null;
  const cfg = getShopConfig();
  if (!cfg.artistsCanSell) {
    return NextResponse.json({ status: "error", message: "Vente artiste désactivée." }, { status: 403 });
  }
  if (session.artist_id !== productArtistId) {
    return NextResponse.json({ status: "error", message: "Accès refusé." }, { status: 403 });
  }
  return null;
}

// ─── GET /api/shop/products/[id] ─────────────────────────────────────────────────
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  const { id } = await params;
  const product = getProductWithTiers(id);
  if (!product) {
    return NextResponse.json({ status: "error", message: "Introuvable" }, { status: 404 });
  }
  const denied = await authorize(product.artist_id, session as SessionData);
  if (denied) return denied;
  return NextResponse.json({ status: "success", data: product });
}

// ─── PUT /api/shop/products/[id] ─────────────────────────────────────────────────
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  const { id } = await params;
  const product = getProduct(id);
  if (!product) {
    return NextResponse.json({ status: "error", message: "Introuvable" }, { status: 404 });
  }
  const denied = await authorize(product.artist_id, session as SessionData);
  if (denied) return denied;

  try {
    const fd = await req.formData();
    const isAdmin = session.role === "admin";

    const updates: Parameters<typeof updateProduct>[1] = {};
    const title = fd.get("title") as string | null;
    const description = fd.get("description") as string | null;
    const status = fd.get("status") as string | null;
    const bpm = fd.get("bpm") as string | null;
    const musicKey = fd.get("music_key") as string | null;
    if (title !== null) updates.title = title.trim();
    if (description !== null) updates.description = description.trim();
    if (status !== null) updates.status = status as ProductStatus;
    if (bpm !== null) updates.bpm = bpm ? parseInt(bpm, 10) || undefined : undefined;
    if (musicKey !== null) updates.music_key = musicKey.trim() || undefined;
    // Only admins may reassign the artist.
    if (isAdmin) {
      const artistId = fd.get("artist_id") as string | null;
      if (artistId) updates.artist_id = artistId.trim();
    }

    const cover = fd.get("cover") as File | null;
    if (cover && cover.size > 0) updates.cover_url = await savePublicAsset(cover, "shop_cover");
    const preview = fd.get("preview") as File | null;
    if (preview && preview.size > 0) updates.preview_audio_url = await savePublicAsset(preview, "shop_preview");

    updateProduct(id, updates);

    // ── Reconcile tiers ──
    const tiersRaw = fd.get("tiers") as string | null;
    if (tiersRaw !== null) {
      let incoming: TierMeta[] = [];
      try {
        incoming = JSON.parse(tiersRaw);
      } catch {
        return NextResponse.json({ status: "error", message: "Paliers invalides." }, { status: 400 });
      }
      const existing = listTiers(id);
      const incomingIds = new Set(incoming.filter((t) => t.id).map((t) => t.id));

      // Delete removed tiers
      for (const e of existing) {
        if (!incomingIds.has(e.id)) deleteTier(e.id);
      }

      // Update / create
      for (let i = 0; i < incoming.length; i++) {
        const t = incoming[i];
        const tierFile = fd.get(`tier_file_${i}`) as File | null;
        let fileData: { filePath: string; fileName: string } | null = null;
        if (tierFile && tierFile.size > 0) fileData = await saveDeliverable(tierFile, "tier");

        if (t.id) {
          updateTier(t.id, {
            name: t.name,
            price_cents: Math.max(0, Math.round(t.price_cents)),
            license_type: t.license_type,
            is_exclusive: !!t.is_exclusive,
            sort_order: t.sort_order ?? i,
            ...(fileData ? { file_path: fileData.filePath, file_name: fileData.fileName } : {}),
          });
        } else {
          createTier({
            product_id: id,
            name: t.name,
            price_cents: Math.max(0, Math.round(t.price_cents)),
            license_type: t.license_type,
            is_exclusive: !!t.is_exclusive,
            sort_order: t.sort_order ?? i,
            file_path: fileData?.filePath,
            file_name: fileData?.fileName,
          });
        }
      }
    }

    return NextResponse.json({ status: "success", message: "Prod mise à jour.", data: getProductWithTiers(id) });
  } catch (err) {
    console.error("[PUT /api/shop/products/[id]]", err);
    return NextResponse.json({ status: "error", message: "Erreur serveur" }, { status: 500 });
  }
}

// ─── DELETE /api/shop/products/[id] ──────────────────────────────────────────────
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  const { id } = await params;
  const product = getProduct(id);
  if (!product) {
    return NextResponse.json({ status: "error", message: "Introuvable" }, { status: 404 });
  }
  const denied = await authorize(product.artist_id, session as SessionData);
  if (denied) return denied;

  deleteProduct(id);
  return NextResponse.json({ status: "success", message: "Prod supprimée." });
}
