import { NextRequest, NextResponse } from "next/server";
import { getStripe, isStripeConfigured, publicBaseUrl } from "@/lib/stripe";
import {
  getTier,
  getProduct,
  getShopConfig,
  computeSplit,
  createOrder,
  addOrderItem,
  setOrderSession,
  setOrderDiscount,
} from "@/lib/shop";
import { validateDiscount } from "@/lib/discounts";
import { getArtistProfileById } from "@/lib/data";
import { parseBody, checkoutSchema } from "@/lib/validation";

// ─── POST /api/shop/checkout — public (anonymous buyers) ────────────────────────
export async function POST(req: NextRequest) {
  if (!isStripeConfigured()) {
    return NextResponse.json(
      { status: "error", message: "Paiement indisponible pour le moment." },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ status: "error", message: "Requête invalide." }, { status: 400 });
  }
  const parsed = parseBody(checkoutSchema, body);
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
  const artist = getArtistProfileById(product.artist_id);
  if (!artist?.stripeAccountId || !artist.stripeChargesEnabled) {
    return NextResponse.json(
      { status: "error", message: "Cet artiste n'a pas encore activé les paiements." },
      { status: 409 }
    );
  }
  if (tier.price_cents <= 0) {
    return NextResponse.json({ status: "error", message: "Prix invalide." }, { status: 400 });
  }

  // ─── Discount (optional) ──────────────────────────────────────────────────
  // Option A repartition: we apply the discount to the unit_amount sent to
  // Stripe, and the application_fee is computed from the discounted price too
  // — so platform & artist share the promo proportionally.
  const originalPriceCents = tier.price_cents;
  let finalPriceCents = originalPriceCents;
  let appliedDiscountCode: string | null = null;
  let appliedDiscountCents = 0;

  if (parsed.data.discount_code) {
    const v = validateDiscount(parsed.data.discount_code, product.artist_id, originalPriceCents);
    if (!v.valid) {
      return NextResponse.json({ status: "error", message: v.message ?? "Code promo invalide." }, { status: 400 });
    }
    finalPriceCents = v.new_price_cents!;
    appliedDiscountCode = v.code!;
    appliedDiscountCents = v.discount_cents!;
  }

  const cfg = getShopConfig();
  const { platform_fee_cents } = computeSplit(finalPriceCents);
  const base = publicBaseUrl();

  try {
    // Pre-create a pending order + item (snapshots price & commission split).
    const order = createOrder({ amount_total_cents: finalPriceCents, currency: cfg.currency });
    addOrderItem({
      order_id: order.id,
      product_id: product.id,
      tier_id: tier.id,
      product_title: product.title,
      tier_name: tier.name,
      artist_id: product.artist_id,
      price_cents: finalPriceCents,
      original_price_cents: appliedDiscountCode ? originalPriceCents : undefined,
    });
    if (appliedDiscountCode) {
      setOrderDiscount(order.id, appliedDiscountCode, appliedDiscountCents);
    }

    const images =
      product.cover_url && product.cover_url.startsWith("/")
        ? [`${base}${product.cover_url}`]
        : product.cover_url
          ? [product.cover_url]
          : undefined;

    const productName = appliedDiscountCode
      ? `${product.title} — ${tier.name} (code ${appliedDiscountCode.toUpperCase()})`
      : `${product.title} — ${tier.name}`;

    const session = await getStripe().checkout.sessions.create(
      {
        mode: "payment",
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: cfg.currency,
              unit_amount: finalPriceCents,
              product_data: {
                name: productName,
                ...(images ? { images } : {}),
              },
            },
          },
        ],
        payment_intent_data: { application_fee_amount: platform_fee_cents },
        success_url: `${base}/shop/success?session_id={CHECKOUT_SESSION_ID}&order=${order.id}`,
        cancel_url: `${base}/shop/${product.id}`,
        metadata: {
          order_id: order.id,
          product_id: product.id,
          tier_id: tier.id,
          artist_id: product.artist_id,
          ...(appliedDiscountCode
            ? { discount_code: appliedDiscountCode, discount_amount_cents: String(appliedDiscountCents) }
            : {}),
        },
      },
      { stripeAccount: artist.stripeAccountId }
    );

    setOrderSession(order.id, session.id);
    return NextResponse.json({ status: "success", data: { url: session.url } });
  } catch (err) {
    console.error("[POST /api/shop/checkout]", err);
    return NextResponse.json({ status: "error", message: "Erreur lors de la création du paiement." }, { status: 500 });
  }
}
