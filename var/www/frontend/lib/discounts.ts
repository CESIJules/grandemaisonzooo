// Discount codes — admin-managed promo codes that reduce a product's price.
// Repartition (Option A — proportional): the discounted price is sent to Stripe,
// commission is recomputed on the reduced price, so platform & artist share the
// promo proportionally.
import crypto from "crypto";
import { rawDb } from "./db";
import { DiscountCode, DiscountType, DiscountValidationResult } from "@/types";

function now(): string {
  return new Date()
    .toLocaleString("sv-SE", { timeZone: "Europe/Paris" })
    .replace("T", " ");
}

function newId(bytes = 8): string {
  return crypto.randomBytes(bytes).toString("hex");
}

interface DiscountRow {
  id: string;
  code: string;
  type: string;
  value: number;
  artist_id: string | null;
  max_uses: number | null;
  used_count: number;
  expires_at: string | null;
  enabled: number;
  created_at: string;
  updated_at: string;
}

function mapRow(r: DiscountRow): DiscountCode {
  return {
    id: r.id,
    code: r.code,
    type: r.type as DiscountType,
    value: r.value,
    artist_id: r.artist_id ?? undefined,
    max_uses: r.max_uses ?? undefined,
    used_count: r.used_count,
    expires_at: r.expires_at ?? undefined,
    enabled: r.enabled === 1,
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

// ─── CRUD ───────────────────────────────────────────────────────────────────
export interface DiscountInput {
  code: string;
  type: DiscountType;
  value: number;
  artist_id?: string | null;
  max_uses?: number | null;
  expires_at?: string | null;
  enabled?: boolean;
}

export function listDiscounts(): DiscountCode[] {
  const rows = rawDb()
    .prepare("SELECT * FROM discount_codes ORDER BY created_at DESC")
    .all() as DiscountRow[];
  return rows.map(mapRow);
}

export function getDiscount(id: string): DiscountCode | null {
  const r = rawDb()
    .prepare("SELECT * FROM discount_codes WHERE id = ?")
    .get(id) as DiscountRow | undefined;
  return r ? mapRow(r) : null;
}

export function getDiscountByCode(code: string): DiscountCode | null {
  const r = rawDb()
    .prepare("SELECT * FROM discount_codes WHERE code = ? COLLATE NOCASE")
    .get(code.trim()) as DiscountRow | undefined;
  return r ? mapRow(r) : null;
}

export function createDiscount(input: DiscountInput): DiscountCode {
  const id = newId();
  const ts = now();
  const trimmedCode = input.code.trim();
  rawDb()
    .prepare(
      `INSERT INTO discount_codes
         (id, code, type, value, artist_id, max_uses, used_count, expires_at, enabled, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?)`
    )
    .run(
      id,
      trimmedCode,
      input.type,
      input.value,
      input.artist_id ?? null,
      input.max_uses ?? null,
      input.expires_at ?? null,
      input.enabled === false ? 0 : 1,
      ts,
      ts
    );
  return getDiscount(id)!;
}

export function updateDiscount(
  id: string,
  patch: Partial<DiscountInput>
): DiscountCode | null {
  const existing = getDiscount(id);
  if (!existing) return null;
  const sets: string[] = [];
  const params: unknown[] = [];
  if (patch.code !== undefined) { sets.push("code = ?"); params.push(patch.code.trim()); }
  if (patch.type !== undefined) { sets.push("type = ?"); params.push(patch.type); }
  if (patch.value !== undefined) { sets.push("value = ?"); params.push(patch.value); }
  if (patch.artist_id !== undefined) { sets.push("artist_id = ?"); params.push(patch.artist_id ?? null); }
  if (patch.max_uses !== undefined) { sets.push("max_uses = ?"); params.push(patch.max_uses ?? null); }
  if (patch.expires_at !== undefined) { sets.push("expires_at = ?"); params.push(patch.expires_at ?? null); }
  if (patch.enabled !== undefined) { sets.push("enabled = ?"); params.push(patch.enabled ? 1 : 0); }
  if (sets.length === 0) return existing;
  sets.push("updated_at = ?"); params.push(now());
  params.push(id);
  rawDb()
    .prepare(`UPDATE discount_codes SET ${sets.join(", ")} WHERE id = ?`)
    .run(...params);
  return getDiscount(id);
}

export function deleteDiscount(id: string): boolean {
  const r = rawDb().prepare("DELETE FROM discount_codes WHERE id = ?").run(id);
  return r.changes > 0;
}

// ─── Validation & application ───────────────────────────────────────────────
function isExpired(expiresAt?: string): boolean {
  if (!expiresAt) return false;
  // expires_at is ISO-like 'YYYY-MM-DD' or 'YYYY-MM-DD HH:MM:SS' in Paris TZ.
  const d = new Date(expiresAt.replace(" ", "T"));
  if (Number.isNaN(d.getTime())) return false;
  return d.getTime() < Date.now();
}

function computeDiscount(d: DiscountCode, priceCents: number): number {
  if (d.type === "percent") {
    const pct = Math.max(0, Math.min(100, d.value));
    return Math.min(priceCents, Math.round((priceCents * pct) / 100));
  }
  // fixed (cents): cap at price so we never go negative
  return Math.min(priceCents, Math.max(0, Math.round(d.value)));
}

function buildLabel(d: DiscountCode): string {
  if (d.type === "percent") return `-${d.value}% (${d.code.toUpperCase()})`;
  return `-${(d.value / 100).toFixed(2)}€ (${d.code.toUpperCase()})`;
}

/**
 * Validate a code for a given product/artist + price.
 * Pure read: does NOT increment used_count (that happens after successful payment).
 */
export function validateDiscount(
  code: string,
  productArtistId: string,
  priceCents: number
): DiscountValidationResult {
  const trimmed = code.trim();
  if (!trimmed) return { valid: false, message: "Code vide." };

  const d = getDiscountByCode(trimmed);
  if (!d) return { valid: false, message: "Code inconnu." };
  if (!d.enabled) return { valid: false, message: "Code désactivé." };
  if (isExpired(d.expires_at)) return { valid: false, message: "Code expiré." };
  if (d.max_uses != null && d.used_count >= d.max_uses) {
    return { valid: false, message: "Code épuisé." };
  }
  if (d.artist_id && d.artist_id !== productArtistId) {
    return { valid: false, message: "Code non valable pour cette prod." };
  }
  if (priceCents <= 0) return { valid: false, message: "Prix invalide." };

  const discount_cents = computeDiscount(d, priceCents);
  if (discount_cents <= 0) return { valid: false, message: "Réduction nulle." };

  return {
    valid: true,
    code: d.code,
    discount_cents,
    new_price_cents: priceCents - discount_cents,
    original_price_cents: priceCents,
    label: buildLabel(d),
  };
}

/**
 * Atomically increment used_count after a successful payment.
 * Uses a WHERE guard so concurrent calls don't exceed max_uses.
 */
export function recordDiscountUse(code: string): void {
  const trimmed = code.trim();
  if (!trimmed) return;
  rawDb()
    .prepare(
      `UPDATE discount_codes
          SET used_count = used_count + 1,
              updated_at = ?
        WHERE code = ? COLLATE NOCASE
          AND (max_uses IS NULL OR used_count < max_uses)`
    )
    .run(now(), trimmed);
}
