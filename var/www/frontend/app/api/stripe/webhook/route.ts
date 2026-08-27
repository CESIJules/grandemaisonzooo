// Stripe webhook — receives events from connected accounts (Connect endpoint).
// Stripe sends checkout.session.completed when a customer completes a purchase,
// and account.updated when an artist's onboarding state changes.
//
// IMPORTANT: this route reads the raw body to verify the signature, so we
// disable any body parsing and we force the runtime to nodejs (not edge).
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { fulfillOrder } from "@/lib/fulfillment";
import { getOrderBySession } from "@/lib/shop";
import { recordDiscountUse } from "@/lib/discounts";
import { getArtistByStripeAccount, setArtistStripe } from "@/lib/data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[stripe webhook] STRIPE_WEBHOOK_SECRET not set");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  // Raw body is required for signature verification.
  const raw = await req.text();

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(raw, sig, secret);
  } catch (err) {
    console.error("[stripe webhook] signature verification failed", (err as Error).message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // event.account is set when the event was forwarded from a connected account
  // (which is our case for direct charges + Connect onboarding).
  const connectedAccountId = event.account ?? null;

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }
      case "account.updated": {
        const account = event.data.object as Stripe.Account;
        await handleAccountUpdated(account, connectedAccountId ?? account.id);
        break;
      }
      default:
        // Ignore everything else, but log it once for observability.
        console.log(`[stripe webhook] ignored event ${event.type}`);
    }
  } catch (err) {
    console.error(`[stripe webhook] handler error for ${event.type}:`, err);
    // Return 500 so Stripe retries.
    return NextResponse.json({ error: "Handler error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

// ─── checkout.session.completed ─────────────────────────────────────────────
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  if (session.payment_status !== "paid") {
    console.log(`[stripe webhook] checkout session ${session.id} not paid yet (${session.payment_status})`);
    return;
  }

  // We stash order_id in metadata when we create the session.
  const orderId =
    (session.metadata?.order_id as string | undefined) ??
    getOrderBySession(session.id)?.id;

  if (!orderId) {
    console.error(`[stripe webhook] no matching order for session ${session.id}`);
    return;
  }

  const paymentIntent =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id;

  fulfillOrder(orderId, {
    paymentIntent,
    amountTotalCents: session.amount_total ?? undefined,
    buyerEmail: session.customer_details?.email ?? session.customer_email ?? undefined,
  });

  // Increment used_count on the promo code (if any). Guarded by SQL to stay
  // within max_uses even under concurrent webhook delivery.
  const discountCode = session.metadata?.discount_code as string | undefined;
  if (discountCode) {
    try { recordDiscountUse(discountCode); }
    catch (err) { console.error(`[stripe webhook] recordDiscountUse failed for ${discountCode}:`, err); }
  }

  console.log(`[stripe webhook] order ${orderId} fulfilled (session ${session.id})`);
}

// ─── account.updated ────────────────────────────────────────────────────────
async function handleAccountUpdated(account: Stripe.Account, accountId: string) {
  const artist = getArtistByStripeAccount(accountId);
  if (!artist) {
    console.log(`[stripe webhook] account.updated for ${accountId} — no matching artist`);
    return;
  }
  setArtistStripe(artist.id, {
    stripeAccountId: accountId,
    stripeChargesEnabled: !!account.charges_enabled,
    stripeDetailsSubmitted: !!account.details_submitted,
  });
  console.log(
    `[stripe webhook] artist ${artist.id} updated: charges=${account.charges_enabled} details=${account.details_submitted}`
  );
}
