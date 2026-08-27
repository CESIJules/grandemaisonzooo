// Server-only Stripe client + helpers.
import Stripe from "stripe";

let _stripe: Stripe | null = null;

/** Lazily-initialised Stripe client. Throws if the secret key is missing. */
export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error("[GMZ] STRIPE_SECRET_KEY manquant dans .env.local");
    }
    _stripe = new Stripe(key);
  }
  return _stripe;
}

/** True when a Stripe secret key is configured (used to gate the UI gracefully). */
export function isStripeConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}

/** True if we're in live mode (sk_live_*), false if test mode (sk_test_*). */
export function isStripeLiveMode(): boolean {
  return (process.env.STRIPE_SECRET_KEY ?? "").startsWith("sk_live_");
}

/** Dashboard URL prefix for the platform — switches between live and test. */
export function stripeDashboardBase(): string {
  return isStripeLiveMode()
    ? "https://dashboard.stripe.com"
    : "https://dashboard.stripe.com/test";
}

/** Public site URL used for Stripe redirects (onboarding return, checkout success/cancel). */
export function publicBaseUrl(): string {
  return (process.env.PUBLIC_BASE_URL || "https://grandemaisonzoo.com").replace(
    /\/+$/,
    ""
  );
}
