import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getStripe, isStripeConfigured, publicBaseUrl } from "@/lib/stripe";
import { getArtistProfileById, setArtistStripe } from "@/lib/data";

/** Resolve which artist this request acts on (artist → self; admin → ?artist_id). */
async function resolveArtistId(req: NextRequest): Promise<string | null> {
  const session = await getSession();
  if (!session.logged_in) return null;
  if (session.role === "admin") {
    const q = req.nextUrl.searchParams.get("artist_id");
    return q || session.artist_id || null;
  }
  return session.artist_id || null;
}

// ─── GET /api/shop/connect — connection status (refreshes from Stripe) ──────────
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session.logged_in) {
    return NextResponse.json({ status: "error", message: "Non autorisé" }, { status: 401 });
  }
  const artistId = await resolveArtistId(req);
  const configured = isStripeConfigured();

  if (!artistId) {
    return NextResponse.json({
      status: "success",
      data: { configured, artistId: null, hasAccount: false, chargesEnabled: false, detailsSubmitted: false },
    });
  }

  const profile = getArtistProfileById(artistId);
  let chargesEnabled = profile?.stripeChargesEnabled ?? false;
  let detailsSubmitted = profile?.stripeDetailsSubmitted ?? false;

  // If we have an account and Stripe is configured, refresh the live status.
  if (configured && profile?.stripeAccountId) {
    try {
      const acct = await getStripe().accounts.retrieve(profile.stripeAccountId);
      chargesEnabled = acct.charges_enabled ?? false;
      detailsSubmitted = acct.details_submitted ?? false;
      setArtistStripe(artistId, { stripeChargesEnabled: chargesEnabled, stripeDetailsSubmitted: detailsSubmitted });
    } catch (err) {
      console.error("[GET /api/shop/connect] retrieve", err);
    }
  }

  return NextResponse.json({
    status: "success",
    data: {
      configured,
      artistId,
      hasAccount: !!profile?.stripeAccountId,
      chargesEnabled,
      detailsSubmitted,
    },
  });
}

// ─── POST /api/shop/connect — create account (if needed) + onboarding link ──────
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.logged_in) {
    return NextResponse.json({ status: "error", message: "Non autorisé" }, { status: 401 });
  }
  if (!isStripeConfigured()) {
    return NextResponse.json(
      { status: "error", message: "Stripe n'est pas encore configuré (clé API manquante)." },
      { status: 503 }
    );
  }

  const artistId = await resolveArtistId(req);
  if (!artistId) {
    return NextResponse.json({ status: "error", message: "Aucun artiste associé à ce compte." }, { status: 400 });
  }
  const profile = getArtistProfileById(artistId);
  if (!profile) {
    return NextResponse.json({ status: "error", message: "Profil artiste introuvable." }, { status: 404 });
  }

  try {
    const stripe = getStripe();
    let accountId = profile.stripeAccountId;

    // Create a connected account using the new controller-based API.
    // Settings must match the Connect platform profile in the Stripe Dashboard:
    //   - dashboard: full                → controller.stripe_dashboard.type = "full"
    //   - losses collector: stripe       → controller.losses.payments = "stripe"
    //   - fees collector: account        → controller.fees.payer = "account"
    //   - requirements: Stripe-hosted    → controller.requirement_collection = "stripe"
    if (!accountId) {
      const account = await stripe.accounts.create({
        controller: {
          stripe_dashboard: { type: "full" },
          losses: { payments: "stripe" },
          fees: { payer: "account" },
          requirement_collection: "stripe",
        },
        country: "FR",
        metadata: { artist_id: artistId },
        capabilities: { transfers: { requested: true }, card_payments: { requested: true } },
      });
      accountId = account.id;
      setArtistStripe(artistId, { stripeAccountId: accountId });
    }

    const base = publicBaseUrl();
    const link = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${base}/admin?shop=connect_refresh`,
      return_url: `${base}/admin?shop=connect_return`,
      type: "account_onboarding",
    });

    return NextResponse.json({ status: "success", data: { url: link.url } });
  } catch (err) {
    console.error("[POST /api/shop/connect]", err);
    // Surface the real Stripe message to the admin so we can act on it
    // (e.g. "Please review the responsibilities…", "Platform profile incomplete", etc.)
    const message = err instanceof Error ? err.message : "Erreur Stripe inconnue";
    return NextResponse.json({ status: "error", message: `Stripe: ${message}` }, { status: 500 });
  }
}
