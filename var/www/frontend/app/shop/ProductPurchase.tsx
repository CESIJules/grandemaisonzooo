"use client";
import { useEffect, useMemo, useState } from "react";
import styles from "./shop.module.css";
import { findPresetByName, fallbackRightsFor, type RightsMatrix } from "@/lib/licensePresets";

interface Tier {
  id: string;
  name: string;
  price_cents: number;
  license_type?: string;
  is_exclusive: boolean;
  sort_order: number;
}

interface AppliedDiscount {
  code: string;
  discount_cents: number;
}

function euros(cents: number): string {
  return `${(cents / 100).toFixed(2)} €`;
}

function formatsBadges(formatsLine: string): string[] {
  return formatsLine
    .split(/[,+]|\bet\b|\band\b/i)
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);
}

function rightsFor(tier: Tier): RightsMatrix {
  const preset = findPresetByName(tier.name);
  if (preset) return preset.rights;
  return fallbackRightsFor({ name: tier.name, is_exclusive: tier.is_exclusive });
}

export default function ProductPurchase({
  tiers,
  purchasable,
}: {
  tiers: Tier[];
  purchasable: boolean;
}) {
  const sorted = useMemo(
    () =>
      tiers
        .slice()
        .sort((a, b) => a.sort_order - b.sort_order || a.price_cents - b.price_cents),
    [tiers]
  );

  const [selectedId, setSelectedId] = useState<string>(sorted[0]?.id ?? "");
  const [termsOpen, setTermsOpen] = useState(true);

  // Promo code state
  const [promoInput, setPromoInput] = useState("");
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [applied, setApplied] = useState<AppliedDiscount | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = sorted.find((t) => t.id === selectedId) ?? sorted[0];

  // Re-validate the promo whenever the selected tier changes
  useEffect(() => {
    if (!applied || !selected) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/shop/discount/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: applied.code, tier_id: selected.id }),
        });
        const data = await res.json();
        if (cancelled) return;
        if (data.status === "success" && data.data?.valid) {
          setApplied({ code: applied.code, discount_cents: data.data.discount_cents ?? 0 });
        } else {
          setApplied(null);
          setPromoError(data.message ?? "Code non valable pour ce palier.");
        }
      } catch {
        if (!cancelled) {
          setApplied(null);
          setPromoError("Erreur de validation du code.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  if (!selected) return null;

  const originalPrice = selected.price_cents;
  const discountAmount = applied?.discount_cents ?? 0;
  const finalPrice = Math.max(0, originalPrice - discountAmount);

  async function applyPromo(e?: React.FormEvent) {
    if (e) e.preventDefault();
    const code = promoInput.trim();
    if (!code || !selected) return;
    setPromoError(null);
    setPromoLoading(true);
    try {
      const res = await fetch("/api/shop/discount/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, tier_id: selected.id }),
      });
      const data = await res.json();
      if (data.status === "success" && data.data?.valid) {
        setApplied({ code, discount_cents: data.data.discount_cents ?? 0 });
        setPromoInput("");
      } else {
        setApplied(null);
        setPromoError(data.message ?? "Code promo invalide.");
      }
    } catch {
      setApplied(null);
      setPromoError("Erreur de connexion.");
    } finally {
      setPromoLoading(false);
    }
  }

  function removePromo() {
    setApplied(null);
    setPromoError(null);
  }

  async function buy() {
    if (!selected) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/shop/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tier_id: selected.id,
          ...(applied ? { discount_code: applied.code } : {}),
        }),
      });
      const data = await res.json();
      if (data.status === "success" && data.data?.url) {
        window.location.href = data.data.url;
      } else {
        setError(data.message ?? "Erreur lors du paiement.");
        setLoading(false);
      }
    } catch {
      setError("Erreur de connexion.");
      setLoading(false);
    }
  }

  const rights = rightsFor(selected);
  const fmts = formatsBadges(rights.formats);

  return (
    <div className={styles.purchaseBlock}>
      {/* ── Licensing header (sticky on scroll) ─────────────────── */}
      <div className={styles.licensingHeader}>
        <div className={styles.licensingTitleWrap}>
          <h2 className={styles.licensingTitle}>Licences</h2>
          <span className={styles.licensingHint}>
            Sélectionne la licence qui correspond à ton usage
          </span>
        </div>
        <div className={styles.headerRight}>
          <div className={styles.totalGroup}>
            <span className={styles.totalLabel}>Total</span>
            {applied ? (
              <span className={styles.totalAmountStack}>
                <span className={styles.totalStrike}>{euros(originalPrice)}</span>
                <span className={styles.totalAmount}>{euros(finalPrice)}</span>
              </span>
            ) : (
              <span className={styles.totalAmount}>{euros(originalPrice)}</span>
            )}
          </div>
          <button
            type="button"
            className={styles.buyBtn}
            onClick={buy}
            disabled={!purchasable || loading}
          >
            {loading ? (
              <>
                <i className="fas fa-circle-notch fa-spin" /> Redirection…
              </>
            ) : (
              <>
                <i className="fas fa-bag-shopping" /> Acheter
              </>
            )}
          </button>
        </div>
      </div>

      {error && <p className={styles.error}>{error}</p>}

      {/* ── Tier card grid ──────────────────────────────────────── */}
      <div className={styles.tierGrid}>
        {sorted.map((t) => {
          const tRights = rightsFor(t);
          const tFmts = formatsBadges(tRights.formats);
          const isSelected = t.id === selected.id;
          return (
            <button
              type="button"
              key={t.id}
              className={`${styles.tierCard} ${isSelected ? styles.tierCardActive : ""} ${t.is_exclusive ? styles.tierCardExclusive : ""}`}
              onClick={() => setSelectedId(t.id)}
              aria-pressed={isSelected}
            >
              {isSelected && (
                <span className={styles.tierStar} aria-hidden="true">
                  <i className="fas fa-star" />
                </span>
              )}
              <span className={styles.tierName}>{t.name}</span>
              <span className={styles.tierPrice}>{euros(t.price_cents)}</span>
              <div className={styles.tierFormats}>
                {tFmts.map((f) => (
                  <span key={f} className={styles.formatChip}>
                    {f}
                  </span>
                ))}
              </div>
              {t.is_exclusive && <span className={styles.tierExclTag}>Exclusive</span>}
            </button>
          );
        })}
      </div>

      {/* ── Promo code ──────────────────────────────────────────── */}
      <div className={styles.promoBlock}>
        {applied ? (
          <div className={styles.promoApplied}>
            <i className="fas fa-tag" />
            <span className={styles.promoCode}>{applied.code}</span>
            <span className={styles.promoSavings}>
              −{euros(applied.discount_cents)}
            </span>
            <button
              type="button"
              className={styles.promoRemove}
              onClick={removePromo}
              aria-label="Retirer le code promo"
            >
              <i className="fas fa-xmark" />
            </button>
          </div>
        ) : (
          <form className={styles.promoForm} onSubmit={applyPromo}>
            <label className={styles.promoLabel} htmlFor="promo-code">
              <i className="fas fa-ticket" /> Code promo
            </label>
            <div className={styles.promoRow}>
              <input
                id="promo-code"
                type="text"
                value={promoInput}
                onChange={(e) => {
                  setPromoInput(e.target.value);
                  if (promoError) setPromoError(null);
                }}
                placeholder="Entre ton code"
                className={styles.promoInput}
                autoComplete="off"
                spellCheck={false}
                disabled={promoLoading}
              />
              <button
                type="submit"
                className={styles.promoApplyBtn}
                disabled={promoLoading || !promoInput.trim()}
              >
                {promoLoading ? (
                  <i className="fas fa-circle-notch fa-spin" />
                ) : (
                  "Appliquer"
                )}
              </button>
            </div>
            {promoError && <p className={styles.promoError}>{promoError}</p>}
          </form>
        )}
      </div>

      {/* ── Usage terms accordion ───────────────────────────────── */}
      <div className={`${styles.terms} ${termsOpen ? styles.termsOpen : ""}`}>
        <button
          type="button"
          className={styles.termsHeader}
          onClick={() => setTermsOpen((v) => !v)}
          aria-expanded={termsOpen}
        >
          <span>Conditions d&apos;utilisation</span>
          <i className={`fas fa-chevron-${termsOpen ? "up" : "down"}`} />
        </button>

        {termsOpen && (
          <div className={styles.termsBody}>
            <div className={styles.termsSubhead}>
              <span className={styles.termsTierName}>{selected.name}</span>
              <span className={styles.termsTierPrice}>· {euros(selected.price_cents)}</span>
              {fmts.length > 0 && (
                <span className={styles.termsTierType}>· {rights.formats}</span>
              )}
            </div>

            <div className={styles.rightsGrid}>
              <RightItem icon="fas fa-file-arrow-down" label={rights.delivery} />
              <RightItem icon="fas fa-compact-disc" label={`Distribution : ${rights.copies}`} />
              <RightItem icon="fas fa-play" label={`Streams en ligne : ${rights.streams}`} />
              <RightItem icon="fas fa-video" label={`Clips vidéo : ${rights.music_videos}`} />
              <RightItem
                icon="fas fa-microphone-lines"
                label={`Performances payantes : ${rights.paid_performances}`}
              />
              <RightItem
                icon="fas fa-broadcast-tower"
                label={`Radio : ${rights.radio_broadcasting}`}
              />
            </div>

            {selected.license_type && (
              <p className={styles.termsNote}>
                <i className="fas fa-file-signature" /> {selected.license_type}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function RightItem({ icon, label }: { icon: string; label: string }) {
  return (
    <div className={styles.rightItem}>
      <i className={icon} />
      <span className={styles.rightLabel}>{label}</span>
    </div>
  );
}
