// Public: validate a promo code against a specific tier (price preview before checkout).
import { NextRequest, NextResponse } from "next/server";
import { getTier, getProduct } from "@/lib/shop";
import { validateDiscount } from "@/lib/discounts";
import { parseBody, discountValidateSchema } from "@/lib/validation";

export async function POST(req: NextRequest) {
  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ status: "error", message: "Requête invalide." }, { status: 400 }); }

  const parsed = parseBody(discountValidateSchema, body);
  if (!parsed.success) {
    return NextResponse.json({ status: "error", message: parsed.error }, { status: 400 });
  }

  const tier = getTier(parsed.data.tier_id);
  if (!tier) {
    return NextResponse.json({ status: "error", message: "Palier introuvable." }, { status: 404 });
  }
  const product = getProduct(tier.product_id);
  if (!product || product.status !== "published") {
    return NextResponse.json({ status: "error", message: "Prod indisponible." }, { status: 404 });
  }

  const result = validateDiscount(parsed.data.code, product.artist_id, tier.price_cents);
  return NextResponse.json({ status: result.valid ? "success" : "error", data: result, message: result.message });
}
