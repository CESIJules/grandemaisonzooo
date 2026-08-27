"use client";
import { useState } from "react";
import styles from "./shop.module.css";

interface AppliedPromo {
  code: string;
  label: string;
  discountCents: number;
  newPriceCents: number;
}

export default function BuyButton({
  tierId,
  priceCents,
  priceLabel,
  disabled,
}: {
  tierId: string;
  priceCents: number;          // original tier price in cents (needed for promo preview)
  priceLabel: string;          // already-formatted "12,00 €"
  disabled?: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPromo, setShowPromo] = useState(false);
  const [codeInput, setCodeInput] = useState("");
  const [applying, setApplying] = useState(false);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [applied, setApplied] = useState<AppliedPromo | null>(null);

  function fmtEur(cents: number): string {
    return `${(cents / 100).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
  }

  async function applyPromo() {
    setPromoError(null);
    const code = codeInput.trim();
    if (!code) return;
    setApplying(true);
    try {
      const res = await fetch("/api/shop/discount/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, tier_id: tierId }),
      });
      const data = await res.json();
      if (data.status === "success" && data.data?.valid) {
        setApplied({
          code: data.data.code,
          label: data.data.label,
          discountCents: data.data.discount_cents,
          newPriceCents: data.data.new_price_cents,
        });
        setCodeInput("");
      } else {
        setPromoError(data.message ?? "Code invalide.");
        setApplied(null);
      }
    } catch {
      setPromoError("Erreur réseau.");
    } finally {
      setApplying(false);
    }
  }

  function removePromo() {
    setApplied(null);
    setPromoError(null);
  }

  async function buy() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/shop/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tier_id: tierId,
          ...(applied ? { discount_code: applied.code } : {}),
        }),
      });
      const data = await res.json();
      if (data.status === "success" && data.data?.url) {
        window.location.href = data.data.url;
      } else {
        setError(data.message ?? "Erreur");
        setLoading(false);
      }
    } catch {
      setError("Erreur de connexion.");
      setLoading(false);
    }
  }

  const displayedPriceLabel = applied ? fmtEur(applied.newPriceCents) : priceLabel;

  return (
    <div className={styles.promoWrap}>
      {/* Applied promo row OR toggle button */}
      {applied ? (
        <div className={styles.promoAppliedRow}>
          <span className={styles.promoAppliedLabel}>
            <i className="fas fa-check-circle" /> {applied.label}
          </span>
          <button
            type="button"
            className={styles.promoRemove}
            onClick={removePromo}
            title="Retirer le code"
          >
            <i className="fas fa-times" />
          </button>
        </div>
      ) : showPromo ? (
        <>
          <div className={styles.promoRow}>
            <input
              type="text"
              className={styles.promoInput}
              placeholder="CODE PROMO"
              value={codeInput}
              maxLength={40}
              onChange={(e) => { setCodeInput(e.target.value.toUpperCase()); setPromoError(null); }}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); applyPromo(); } }}
              disabled={applying}
            />
            <button
              type="button"
              className={styles.promoBtn}
              onClick={applyPromo}
              disabled={applying || !codeInput.trim()}
            >
              {applying ? <i className="fas fa-circle-notch fa-spin" /> : "OK"}
            </button>
          </div>
          {promoError && <span className={styles.promoError}>{promoError}</span>}
        </>
      ) : (
        <button
          type="button"
          className={styles.promoToggle}
          onClick={() => setShowPromo(true)}
        >
          <i className="fas fa-tag" style={{ marginRight: 4 }} /> Code promo ?
        </button>
      )}

      {/* Buy button + price (with strikethrough if discount applied) */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
        {applied && (
          <span className={styles.priceStrike}>{priceLabel}</span>
        )}
        <button className={styles.buyBtn} onClick={buy} disabled={disabled || loading}>
          {loading ? (
            <><i className="fas fa-circle-notch fa-spin" /> Redirection…</>
          ) : (
            <><i className="fas fa-bag-shopping" /> Acheter · {displayedPriceLabel}</>
          )}
        </button>
        {error && <span style={{ color: "#f87171", fontSize: "0.75rem" }}>{error}</span>}
      </div>
    </div>
  );
}
