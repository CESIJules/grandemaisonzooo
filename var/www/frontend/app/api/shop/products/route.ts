import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  createProduct,
  createTier,
  getProductWithTiers,
  listProductsWithTiers,
  getShopConfig,
} from "@/lib/shop";
import { savePublicAsset, saveDeliverable } from "@/lib/uploads";
import type { ProductStatus } from "@/types";

// Shape of each tier sent by the client (JSON-encoded in the `tiers` field).
interface TierMeta {
  name: string;
  price_cents: number;
  license_type?: string;
  is_exclusive?: boolean;
  sort_order?: number;
  fileIndex?: number; // index of the attached file field `tier_file_<i>`, if any
}

// ─── GET /api/shop/products ─────────────────────────────────────────────────────
// Management listing: admin → all products, artist → only their own.
export async function GET() {
  const session = await getSession();
  if (!session.logged_in) {
    return NextResponse.json({ status: "error", message: "Non autorisé" }, { status: 401 });
  }
  const products =
    session.role === "admin"
      ? listProductsWithTiers()
      : listProductsWithTiers({ artistId: session.artist_id ?? "__none__" });
  return NextResponse.json({ status: "success", data: products });
}

// ─── POST /api/shop/products ────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.logged_in) {
    return NextResponse.json({ status: "error", message: "Non autorisé" }, { status: 401 });
  }

  const cfg = getShopConfig();
  const isAdmin = session.role === "admin";
  if (!isAdmin && !cfg.artistsCanSell) {
    return NextResponse.json(
      { status: "error", message: "La vente par les artistes est désactivée." },
      { status: 403 }
    );
  }

  try {
    const fd = await req.formData();

    const title = (fd.get("title") as string)?.trim() ?? "";
    const description = (fd.get("description") as string)?.trim() ?? "";
    const status = ((fd.get("status") as string) || "draft") as ProductStatus;
    const bpmRaw = fd.get("bpm") as string | null;
    const musicKey = (fd.get("music_key") as string)?.trim() || undefined;

    // Artists can only publish under their own identity.
    const requestedArtist = (fd.get("artist_id") as string)?.trim() ?? "";
    const artistId = isAdmin ? requestedArtist : session.artist_id ?? "";
    if (!artistId) {
      return NextResponse.json({ status: "error", message: "Artiste manquant." }, { status: 400 });
    }
    if (!title) {
      return NextResponse.json({ status: "error", message: "Titre manquant." }, { status: 400 });
    }

    // Tiers metadata
    let tiers: TierMeta[] = [];
    try {
      tiers = JSON.parse((fd.get("tiers") as string) || "[]");
    } catch {
      return NextResponse.json({ status: "error", message: "Paliers invalides." }, { status: 400 });
    }
    if (!Array.isArray(tiers) || tiers.length === 0) {
      return NextResponse.json({ status: "error", message: "Au moins un palier est requis." }, { status: 400 });
    }

    // Optional assets
    let coverUrl: string | undefined;
    const cover = fd.get("cover") as File | null;
    if (cover && cover.size > 0) coverUrl = await savePublicAsset(cover, "shop_cover");

    let previewUrl: string | undefined;
    const preview = fd.get("preview") as File | null;
    if (preview && preview.size > 0) previewUrl = await savePublicAsset(preview, "shop_preview");

    const product = createProduct({
      artist_id: artistId,
      title,
      description: description || undefined,
      cover_url: coverUrl,
      preview_audio_url: previewUrl,
      bpm: bpmRaw ? parseInt(bpmRaw, 10) || undefined : undefined,
      music_key: musicKey,
      status,
    });

    // Create tiers (+ deliverable files)
    for (let i = 0; i < tiers.length; i++) {
      const t = tiers[i];
      let filePath: string | undefined;
      let fileName: string | undefined;
      const tierFile = fd.get(`tier_file_${i}`) as File | null;
      if (tierFile && tierFile.size > 0) {
        const saved = await saveDeliverable(tierFile, "tier");
        filePath = saved.filePath;
        fileName = saved.fileName;
      }
      createTier({
        product_id: product.id,
        name: t.name,
        price_cents: Math.max(0, Math.round(t.price_cents)),
        license_type: t.license_type,
        is_exclusive: !!t.is_exclusive,
        sort_order: t.sort_order ?? i,
        file_path: filePath,
        file_name: fileName,
      });
    }

    return NextResponse.json(
      { status: "success", message: "Prod créée.", data: getProductWithTiers(product.id) },
      { status: 201 }
    );
  } catch (err) {
    console.error("[POST /api/shop/products]", err);
    return NextResponse.json({ status: "error", message: "Erreur serveur" }, { status: 500 });
  }
}
