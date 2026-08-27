import Link from "next/link";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
import { getOrder, getOrderItems } from "@/lib/shop";
import { getArtistProfileById } from "@/lib/data";
import { fulfillOrder } from "@/lib/fulfillment";
import styles from "../shop.module.css";

export const dynamic = "force-dynamic";

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string; order?: string }>;
}) {
  const { session_id, order: orderId } = await searchParams;

  const order = orderId ? getOrder(orderId) : null;
  if (!order) {
    return (
      <div className={styles.page}>
        <div className={`${styles.inner} ${styles.successBox}`}>
          <h1>Commande introuvable</h1>
          <Link href="/#boutique" className={styles.back}>Retour à la boutique</Link>
        </div>
      </div>
    );
  }

  const items = getOrderItems(order.id);
  const artist = getArtistProfileById(items[0]?.artist_id ?? "");

  // Confirm the payment with Stripe (source of truth) before provisioning.
  let paid = order.status === "paid";
  let paymentIntent: string | undefined;
  let buyerEmail: string | undefined;
  if (!paid && session_id && isStripeConfigured() && artist?.stripeAccountId) {
    try {
      const session = await getStripe().checkout.sessions.retrieve(
        session_id,
        undefined,
        { stripeAccount: artist.stripeAccountId }
      );
      if (session.payment_status === "paid") {
        paid = true;
        paymentIntent = typeof session.payment_intent === "string" ? session.payment_intent : undefined;
        buyerEmail = session.customer_details?.email ?? undefined;
      }
    } catch (err) {
      console.error("[shop/success] retrieve", err);
    }
  }

  if (!paid) {
    return (
      <div className={styles.page}>
        <div className={`${styles.inner} ${styles.successBox}`}>
          <div className={styles.successIcon}><i className="fas fa-hourglass-half" style={{ color: "#fbbf24" }} /></div>
          <h1>Paiement en cours de confirmation</h1>
          <p style={{ color: "rgba(255,255,255,0.65)" }}>
            Si tu viens de payer, recharge la page dans quelques secondes.
          </p>
          <Link href="/#boutique" className={styles.back} style={{ marginTop: "1.5rem" }}>Retour à la boutique</Link>
        </div>
      </div>
    );
  }

  const downloads = fulfillOrder(order.id, { paymentIntent, amountTotalCents: order.amount_total_cents, buyerEmail });

  return (
    <div className={styles.page}>
      <div className={`${styles.inner} ${styles.successBox}`}>
        <div className={styles.successIcon}><i className="fas fa-check-circle" /></div>
        <h1>Merci pour ton achat !</h1>
        <p style={{ color: "rgba(255,255,255,0.65)" }}>
          Ton paiement est confirmé. Télécharge tes fichiers ci-dessous.
        </p>

        <div className={styles.downloadList}>
          {downloads.map((d) => (
            <div key={d.token} className={styles.downloadRow}>
              <div>
                <div style={{ fontWeight: 700 }}>{d.item.product_title}</div>
                <div style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.5)" }}>{d.item.tier_name}</div>
              </div>
              <a className={styles.dlBtn} href={`/api/shop/download/${d.token}`}>
                <i className="fas fa-download" /> Télécharger
              </a>
            </div>
          ))}
        </div>

        <p className={styles.hint}>
          Les liens sont valables 72 h (5 téléchargements max).
          {buyerEmail ? ` Un reçu a été envoyé par Stripe à ${buyerEmail}.` : ""}
        </p>
        <Link href="/#boutique" className={styles.back} style={{ marginTop: "1.5rem" }}>Retour à la boutique</Link>
      </div>
    </div>
  );
}
