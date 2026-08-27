import { NextRequest, NextResponse } from "next/server";
import { getProductWithTiers } from "@/lib/shop";
import { getArtistProfiles } from "@/lib/data";
import { toPublicProduct } from "../route";

// ─── GET /api/shop/catalog/[id] — public single published product ───────────────
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = getProductWithTiers(id);
  if (!product || product.status !== "published") {
    return NextResponse.json({ status: "error", message: "Introuvable" }, { status: 404 });
  }
  const profiles = getArtistProfiles();
  return NextResponse.json({ status: "success", data: toPublicProduct(product, profiles) });
}
