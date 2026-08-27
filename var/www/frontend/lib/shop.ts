// Shop data layer — products, licence tiers, orders, download tokens, payouts.
// Tables are created in lib/db.ts (initTables). All amounts are in cents.
import crypto from "crypto";
import fs from "fs";
import { rawDb } from "./db";
import { PATHS } from "./paths";
import {
  Product,
  ProductTier,
  ProductWithTiers,
  ProductStatus,
  Order,
  OrderItem,
  OrderStatus,
  DownloadToken,
  ShopConfig,
  ArtistPayout,
  SaleRow,
} from "@/types";

// ─── helpers ────────────────────────────────────────────────────────────────
function now(): string {
  return new Date()
    .toLocaleString("sv-SE", { timeZone: "Europe/Paris" })
    .replace("T", " ");
}

function newId(bytes = 12): string {
  return crypto.randomBytes(bytes).toString("hex");
}

// ─── Shop config (JSON, editable from admin) ──────────────────────────────────
const DEFAULT_SHOP_CONFIG: ShopConfig = {
  commissionPct: 10,
  artistsCanSell: true,
  currency: "eur",
};

export function getShopConfig(): ShopConfig {
  if (!fs.existsSync(PATHS.SHOP_CONFIG_JSON)) {
    fs.writeFileSync(
      PATHS.SHOP_CONFIG_JSON,
      JSON.stringify(DEFAULT_SHOP_CONFIG, null, 2),
      "utf-8"
    );
    return { ...DEFAULT_SHOP_CONFIG };
  }
  try {
    const raw = JSON.parse(fs.readFileSync(PATHS.SHOP_CONFIG_JSON, "utf-8"));
    return { ...DEFAULT_SHOP_CONFIG, ...raw };
  } catch {
    return { ...DEFAULT_SHOP_CONFIG };
  }
}

export function saveShopConfig(patch: Partial<ShopConfig>): ShopConfig {
  const merged = { ...getShopConfig(), ...patch };
  // Clamp commission to a sane range
  merged.commissionPct = Math.min(100, Math.max(0, merged.commissionPct));
  fs.writeFileSync(
    PATHS.SHOP_CONFIG_JSON,
    JSON.stringify(merged, null, 2),
    "utf-8"
  );
  return merged;
}

/** Split a price into platform fee + artist share using the current commission. */
export function computeSplit(priceCents: number): {
  platform_fee_cents: number;
  artist_share_cents: number;
} {
  const pct = getShopConfig().commissionPct;
  const platform_fee_cents = Math.round((priceCents * pct) / 100);
  return {
    platform_fee_cents,
    artist_share_cents: priceCents - platform_fee_cents,
  };
}

// ─── row mappers ──────────────────────────────────────────────────────────────
interface ProductRow {
  id: string;
  artist_id: string;
  title: string;
  description: string | null;
  cover_url: string | null;
  preview_audio_url: string | null;
  bpm: number | null;
  music_key: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

interface TierRow {
  id: string;
  product_id: string;
  name: string;
  price_cents: number;
  license_type: string | null;
  file_path: string | null;
  file_name: string | null;
  is_exclusive: number;
  sort_order: number;
}

function mapProduct(r: ProductRow): Product {
  return {
    id: r.id,
    artist_id: r.artist_id,
    title: r.title,
    description: r.description ?? undefined,
    cover_url: r.cover_url ?? undefined,
    preview_audio_url: r.preview_audio_url ?? undefined,
    bpm: r.bpm ?? undefined,
    music_key: r.music_key ?? undefined,
    status: r.status as ProductStatus,
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

function mapTier(r: TierRow): ProductTier {
  return {
    id: r.id,
    product_id: r.product_id,
    name: r.name,
    price_cents: r.price_cents,
    license_type: r.license_type ?? undefined,
    file_path: r.file_path ?? undefined,
    file_name: r.file_name ?? undefined,
    is_exclusive: !!r.is_exclusive,
    sort_order: r.sort_order,
  };
}

// ─── Products ─────────────────────────────────────────────────────────────────
export interface ProductInput {
  artist_id: string;
  title: string;
  description?: string;
  cover_url?: string;
  preview_audio_url?: string;
  bpm?: number;
  music_key?: string;
  status?: ProductStatus;
}

export function createProduct(input: ProductInput): Product {
  const db = rawDb();
  const ts = now();
  const row: ProductRow = {
    id: newId(),
    artist_id: input.artist_id,
    title: input.title,
    description: input.description ?? null,
    cover_url: input.cover_url ?? null,
    preview_audio_url: input.preview_audio_url ?? null,
    bpm: input.bpm ?? null,
    music_key: input.music_key ?? null,
    status: input.status ?? "draft",
    created_at: ts,
    updated_at: ts,
  };
  db.prepare(
    `INSERT INTO products
       (id, artist_id, title, description, cover_url, preview_audio_url, bpm, music_key, status, created_at, updated_at)
     VALUES
       (@id, @artist_id, @title, @description, @cover_url, @preview_audio_url, @bpm, @music_key, @status, @created_at, @updated_at)`
  ).run(row);
  return mapProduct(row);
}

export function getProduct(id: string): Product | null {
  const r = rawDb()
    .prepare("SELECT * FROM products WHERE id = ?")
    .get(id) as ProductRow | undefined;
  return r ? mapProduct(r) : null;
}

export function listProducts(opts?: {
  status?: ProductStatus;
  artistId?: string;
}): Product[] {
  const clauses: string[] = [];
  const params: unknown[] = [];
  if (opts?.status) {
    clauses.push("status = ?");
    params.push(opts.status);
  }
  if (opts?.artistId) {
    clauses.push("artist_id = ?");
    params.push(opts.artistId);
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const rows = rawDb()
    .prepare(`SELECT * FROM products ${where} ORDER BY created_at DESC`)
    .all(...params) as ProductRow[];
  return rows.map(mapProduct);
}

export function getProductWithTiers(id: string): ProductWithTiers | null {
  const product = getProduct(id);
  if (!product) return null;
  return { ...product, tiers: listTiers(id) };
}

export function listProductsWithTiers(opts?: {
  status?: ProductStatus;
  artistId?: string;
}): ProductWithTiers[] {
  return listProducts(opts).map((p) => ({ ...p, tiers: listTiers(p.id) }));
}

export function updateProduct(
  id: string,
  updates: Partial<ProductInput>
): Product | null {
  const existing = rawDb()
    .prepare("SELECT * FROM products WHERE id = ?")
    .get(id) as ProductRow | undefined;
  if (!existing) return null;
  const merged: ProductRow = {
    ...existing,
    artist_id: updates.artist_id ?? existing.artist_id,
    title: updates.title ?? existing.title,
    description: updates.description ?? existing.description,
    cover_url: updates.cover_url ?? existing.cover_url,
    preview_audio_url: updates.preview_audio_url ?? existing.preview_audio_url,
    bpm: updates.bpm ?? existing.bpm,
    music_key: updates.music_key ?? existing.music_key,
    status: updates.status ?? existing.status,
    updated_at: now(),
  };
  rawDb()
    .prepare(
      `UPDATE products SET
         artist_id = @artist_id, title = @title, description = @description,
         cover_url = @cover_url, preview_audio_url = @preview_audio_url,
         bpm = @bpm, music_key = @music_key, status = @status, updated_at = @updated_at
       WHERE id = @id`
    )
    .run(merged);
  return mapProduct(merged);
}

/** Delete a product, its tiers (cascade) and the physical files on disk. */
export function deleteProduct(id: string): boolean {
  const tiers = listTiers(id);
  for (const t of tiers) safeUnlink(t.file_path);
  const res = rawDb().prepare("DELETE FROM products WHERE id = ?").run(id);
  return res.changes > 0;
}

// ─── Tiers ────────────────────────────────────────────────────────────────────
export interface TierInput {
  product_id: string;
  name: string;
  price_cents: number;
  license_type?: string;
  file_path?: string;
  file_name?: string;
  is_exclusive?: boolean;
  sort_order?: number;
}

export function listTiers(productId: string): ProductTier[] {
  const rows = rawDb()
    .prepare(
      "SELECT * FROM product_tiers WHERE product_id = ? ORDER BY sort_order ASC, price_cents ASC"
    )
    .all(productId) as TierRow[];
  return rows.map(mapTier);
}

export function getTier(id: string): ProductTier | null {
  const r = rawDb()
    .prepare("SELECT * FROM product_tiers WHERE id = ?")
    .get(id) as TierRow | undefined;
  return r ? mapTier(r) : null;
}

export function createTier(input: TierInput): ProductTier {
  const row: TierRow = {
    id: newId(),
    product_id: input.product_id,
    name: input.name,
    price_cents: input.price_cents,
    license_type: input.license_type ?? null,
    file_path: input.file_path ?? null,
    file_name: input.file_name ?? null,
    is_exclusive: input.is_exclusive ? 1 : 0,
    sort_order: input.sort_order ?? 0,
  };
  rawDb()
    .prepare(
      `INSERT INTO product_tiers
         (id, product_id, name, price_cents, license_type, file_path, file_name, is_exclusive, sort_order)
       VALUES
         (@id, @product_id, @name, @price_cents, @license_type, @file_path, @file_name, @is_exclusive, @sort_order)`
    )
    .run(row);
  return mapTier(row);
}

export function updateTier(
  id: string,
  updates: Partial<TierInput>
): ProductTier | null {
  const existing = rawDb()
    .prepare("SELECT * FROM product_tiers WHERE id = ?")
    .get(id) as TierRow | undefined;
  if (!existing) return null;
  // If a new file replaces the old one, remove the old file from disk.
  if (updates.file_path && updates.file_path !== existing.file_path) {
    safeUnlink(existing.file_path);
  }
  const merged: TierRow = {
    ...existing,
    name: updates.name ?? existing.name,
    price_cents: updates.price_cents ?? existing.price_cents,
    license_type: updates.license_type ?? existing.license_type,
    file_path: updates.file_path ?? existing.file_path,
    file_name: updates.file_name ?? existing.file_name,
    is_exclusive:
      updates.is_exclusive === undefined
        ? existing.is_exclusive
        : updates.is_exclusive
          ? 1
          : 0,
    sort_order: updates.sort_order ?? existing.sort_order,
  };
  rawDb()
    .prepare(
      `UPDATE product_tiers SET
         name = @name, price_cents = @price_cents, license_type = @license_type,
         file_path = @file_path, file_name = @file_name,
         is_exclusive = @is_exclusive, sort_order = @sort_order
       WHERE id = @id`
    )
    .run(merged);
  return mapTier(merged);
}

export function deleteTier(id: string): boolean {
  const tier = getTier(id);
  if (tier) safeUnlink(tier.file_path);
  const res = rawDb().prepare("DELETE FROM product_tiers WHERE id = ?").run(id);
  return res.changes > 0;
}

// ─── Orders ───────────────────────────────────────────────────────────────────
export interface OrderInput {
  stripe_session_id?: string;
  buyer_email?: string;
  amount_total_cents?: number;
  currency?: string;
  status?: OrderStatus;
}

export function createOrder(input: OrderInput): Order {
  const id = newId();
  const ts = now();
  rawDb()
    .prepare(
      `INSERT INTO orders
         (id, stripe_session_id, stripe_payment_intent, buyer_email, amount_total_cents, currency, status, created_at, paid_at)
       VALUES (?, ?, NULL, ?, ?, ?, ?, ?, NULL)`
    )
    .run(
      id,
      input.stripe_session_id ?? null,
      input.buyer_email ?? null,
      input.amount_total_cents ?? 0,
      input.currency ?? "eur",
      input.status ?? "pending",
      ts
    );
  return getOrder(id)!;
}

export function getOrder(id: string): Order | null {
  const r = rawDb().prepare("SELECT * FROM orders WHERE id = ?").get(id) as
    | Record<string, unknown>
    | undefined;
  return r ? (mapOrder(r) as Order) : null;
}

export function getOrderBySession(sessionId: string): Order | null {
  const r = rawDb()
    .prepare("SELECT * FROM orders WHERE stripe_session_id = ?")
    .get(sessionId) as Record<string, unknown> | undefined;
  return r ? (mapOrder(r) as Order) : null;
}

/** Attach a Stripe Checkout Session id to an existing order. */
export function setOrderSession(orderId: string, sessionId: string): void {
  rawDb()
    .prepare("UPDATE orders SET stripe_session_id = ? WHERE id = ?")
    .run(sessionId, orderId);
}

function mapOrder(r: Record<string, unknown>): Order {
  return {
    id: r.id as string,
    stripe_session_id: (r.stripe_session_id as string) ?? undefined,
    stripe_payment_intent: (r.stripe_payment_intent as string) ?? undefined,
    buyer_email: (r.buyer_email as string) ?? undefined,
    amount_total_cents: r.amount_total_cents as number,
    currency: r.currency as string,
    status: r.status as OrderStatus,
    created_at: r.created_at as string,
    paid_at: (r.paid_at as string) ?? undefined,
    discount_code: (r.discount_code as string) ?? undefined,
    discount_amount_cents: (r.discount_amount_cents as number) ?? 0,
  };
}

export function markOrderPaid(
  id: string,
  paymentIntent?: string,
  amountTotalCents?: number,
  buyerEmail?: string
): void {
  const sets = ["status = 'paid'", "paid_at = ?"];
  const params: unknown[] = [now()];
  if (paymentIntent !== undefined) {
    sets.push("stripe_payment_intent = ?");
    params.push(paymentIntent);
  }
  if (amountTotalCents !== undefined) {
    sets.push("amount_total_cents = ?");
    params.push(amountTotalCents);
  }
  if (buyerEmail !== undefined) {
    sets.push("buyer_email = ?");
    params.push(buyerEmail);
  }
  params.push(id);
  rawDb()
    .prepare(`UPDATE orders SET ${sets.join(", ")} WHERE id = ?`)
    .run(...params);
}

// ─── Order items ──────────────────────────────────────────────────────────────
export interface OrderItemInput {
  order_id: string;
  product_id?: string;
  tier_id?: string;
  product_title: string;
  tier_name: string;
  artist_id: string;
  price_cents: number;
  original_price_cents?: number;   // price before discount, if any
}

export function addOrderItem(input: OrderItemInput): OrderItem {
  const { platform_fee_cents, artist_share_cents } = computeSplit(
    input.price_cents
  );
  const item: OrderItem = {
    id: newId(),
    order_id: input.order_id,
    product_id: input.product_id,
    tier_id: input.tier_id,
    product_title: input.product_title,
    tier_name: input.tier_name,
    artist_id: input.artist_id,
    price_cents: input.price_cents,
    artist_share_cents,
    platform_fee_cents,
  };
  rawDb()
    .prepare(
      `INSERT INTO order_items
         (id, order_id, product_id, tier_id, product_title, tier_name, artist_id, price_cents, artist_share_cents, platform_fee_cents, original_price_cents)
       VALUES
         (@id, @order_id, @product_id, @tier_id, @product_title, @tier_name, @artist_id, @price_cents, @artist_share_cents, @platform_fee_cents, @original_price_cents)`
    )
    .run({
      ...item,
      product_id: item.product_id ?? null,
      tier_id: item.tier_id ?? null,
      original_price_cents: input.original_price_cents ?? null,
    });
  return item;
}

/** Persist the discount code + amount on an order (after createOrder). */
export function setOrderDiscount(
  orderId: string,
  code: string,
  amountCents: number
): void {
  rawDb()
    .prepare(
      "UPDATE orders SET discount_code = ?, discount_amount_cents = ? WHERE id = ?"
    )
    .run(code, amountCents, orderId);
}

export function getOrderItem(id: string): OrderItem | null {
  const r = rawDb()
    .prepare("SELECT * FROM order_items WHERE id = ?")
    .get(id) as Record<string, unknown> | undefined;
  return r ? (mapOrderItem(r) as OrderItem) : null;
}

export function getOrderItems(orderId: string): OrderItem[] {
  const rows = rawDb()
    .prepare("SELECT * FROM order_items WHERE order_id = ?")
    .all(orderId) as Record<string, unknown>[];
  return rows.map(mapOrderItem);
}

function mapOrderItem(r: Record<string, unknown>): OrderItem {
  return {
    id: r.id as string,
    order_id: r.order_id as string,
    product_id: (r.product_id as string) ?? undefined,
    tier_id: (r.tier_id as string) ?? undefined,
    product_title: r.product_title as string,
    tier_name: r.tier_name as string,
    artist_id: r.artist_id as string,
    price_cents: r.price_cents as number,
    artist_share_cents: r.artist_share_cents as number,
    platform_fee_cents: r.platform_fee_cents as number,
  };
}

// ─── Download tokens ──────────────────────────────────────────────────────────
export function createDownloadToken(
  orderItemId: string,
  opts?: { ttlHours?: number; maxDownloads?: number }
): DownloadToken {
  const ttlHours = opts?.ttlHours ?? 72;
  const maxDownloads = opts?.maxDownloads ?? 5;
  const token = newId(32);
  const expires = new Date(Date.now() + ttlHours * 3600_000)
    .toLocaleString("sv-SE", { timeZone: "Europe/Paris" })
    .replace("T", " ");
  const ts = now();
  rawDb()
    .prepare(
      `INSERT INTO download_tokens
         (token, order_item_id, expires_at, max_downloads, download_count, created_at)
       VALUES (?, ?, ?, ?, 0, ?)`
    )
    .run(token, orderItemId, expires, maxDownloads, ts);
  return {
    token,
    order_item_id: orderItemId,
    expires_at: expires,
    max_downloads: maxDownloads,
    download_count: 0,
    created_at: ts,
  };
}

export function getDownloadToken(token: string): DownloadToken | null {
  const r = rawDb()
    .prepare("SELECT * FROM download_tokens WHERE token = ?")
    .get(token) as DownloadToken | undefined;
  return r ?? null;
}

/** All download tokens for the given order item ids (idempotency check). */
export function getDownloadTokensForItems(itemIds: string[]): DownloadToken[] {
  if (itemIds.length === 0) return [];
  const placeholders = itemIds.map(() => "?").join(",");
  return rawDb()
    .prepare(`SELECT * FROM download_tokens WHERE order_item_id IN (${placeholders})`)
    .all(...itemIds) as DownloadToken[];
}

/** Returns true if the token is usable (not expired, quota left). */
export function isTokenValid(t: DownloadToken): boolean {
  if (t.download_count >= t.max_downloads) return false;
  return new Date(t.expires_at.replace(" ", "T")).getTime() > Date.now();
}

export function incrementTokenDownload(token: string): void {
  rawDb()
    .prepare(
      "UPDATE download_tokens SET download_count = download_count + 1 WHERE token = ?"
    )
    .run(token);
}

// ─── Payout ledger ────────────────────────────────────────────────────────────
/** How much is owed to each artist across all PAID orders. */
export function getArtistPayouts(artistId?: string): ArtistPayout[] {
  const where = artistId ? "AND oi.artist_id = ?" : "";
  const params = artistId ? [artistId] : [];
  return rawDb()
    .prepare(
      `SELECT oi.artist_id AS artist_id,
              SUM(oi.artist_share_cents)   AS total_share_cents,
              SUM(oi.platform_fee_cents)   AS total_platform_fee_cents,
              COUNT(*)                     AS order_count
         FROM order_items oi
         JOIN orders o ON o.id = oi.order_id
        WHERE o.status = 'paid' ${where}
        GROUP BY oi.artist_id
        ORDER BY total_share_cents DESC`
    )
    .all(...params) as ArtistPayout[];
}

/** Flat list of all sales (paid orders) joined with their items.
 *  Admin sees everything; pass artistId to restrict to a single artist. */
export function listSales(opts: { artistId?: string; limit?: number } = {}): SaleRow[] {
  const where: string[] = ["o.status = 'paid'"];
  const params: unknown[] = [];
  if (opts.artistId) { where.push("oi.artist_id = ?"); params.push(opts.artistId); }
  const limit = Math.max(1, Math.min(500, opts.limit ?? 200));
  return rawDb()
    .prepare(
      `SELECT o.id                        AS order_id,
              o.paid_at                   AS paid_at,
              o.created_at                AS created_at,
              o.buyer_email               AS buyer_email,
              o.stripe_session_id         AS stripe_session_id,
              o.stripe_payment_intent     AS stripe_payment_intent,
              o.status                    AS status,
              o.currency                  AS currency,
              oi.product_id               AS product_id,
              oi.product_title            AS product_title,
              oi.tier_name                AS tier_name,
              oi.artist_id                AS artist_id,
              oi.price_cents              AS price_cents,
              oi.artist_share_cents       AS artist_share_cents,
              oi.platform_fee_cents       AS platform_fee_cents
         FROM order_items oi
         JOIN orders o ON o.id = oi.order_id
        WHERE ${where.join(" AND ")}
        ORDER BY o.paid_at DESC, o.created_at DESC
        LIMIT ?`
    )
    .all(...params, limit) as SaleRow[];
}

// ─── filesystem safety ────────────────────────────────────────────────────────
/** Remove a file only if it lives inside SHOP_FILES_DIR (defence-in-depth). */
function safeUnlink(filePath?: string | null): void {
  if (!filePath) return;
  const root = PATHS.SHOP_FILES_DIR;
  if (!filePath.startsWith(root)) return;
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch {
    /* ignore */
  }
}
