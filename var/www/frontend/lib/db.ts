import Database from "better-sqlite3";
import { PATHS } from "./paths";
import { PlayHistoryRow, AudienceLog } from "@/types";
import fs from "fs";
import path from "path";

let _db: Database.Database | null = null;

function getDb(): Database.Database {
  if (!_db) {
    fs.mkdirSync(path.dirname(PATHS.ANALYTICS_DB), { recursive: true });
    _db = new Database(PATHS.ANALYTICS_DB);
    _db.pragma("journal_mode = WAL");
    _db.pragma("foreign_keys = ON");
    initTables(_db);
  }
  return _db;
}

function initTables(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS audience_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp DATETIME,
      listeners INTEGER,
      peak_listeners INTEGER
    );
    CREATE TABLE IF NOT EXISTS play_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp DATETIME,
      artist TEXT,
      title TEXT,
      listeners_start INTEGER
    );
    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp DATETIME NOT NULL,
      user TEXT NOT NULL,
      action TEXT NOT NULL,
      target TEXT,
      ip TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_audience_time ON audience_logs(timestamp);
    CREATE INDEX IF NOT EXISTS idx_history_time ON play_history(timestamp);
    CREATE INDEX IF NOT EXISTS idx_audit_time ON audit_log(timestamp);
    CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_log(user);

    -- ─── SHOP ────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      artist_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      cover_url TEXT,
      preview_audio_url TEXT,
      bpm INTEGER,
      music_key TEXT,
      status TEXT NOT NULL DEFAULT 'draft',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS product_tiers (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL,
      name TEXT NOT NULL,
      price_cents INTEGER NOT NULL,
      license_type TEXT,
      file_path TEXT,
      file_name TEXT,
      is_exclusive INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      stripe_session_id TEXT UNIQUE,
      stripe_payment_intent TEXT,
      buyer_email TEXT,
      amount_total_cents INTEGER NOT NULL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT 'eur',
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL,
      paid_at TEXT
    );
    CREATE TABLE IF NOT EXISTS order_items (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      product_id TEXT,
      tier_id TEXT,
      product_title TEXT NOT NULL,
      tier_name TEXT NOT NULL,
      artist_id TEXT NOT NULL,
      price_cents INTEGER NOT NULL,
      artist_share_cents INTEGER NOT NULL,
      platform_fee_cents INTEGER NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS download_tokens (
      token TEXT PRIMARY KEY,
      order_item_id TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      max_downloads INTEGER NOT NULL DEFAULT 5,
      download_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY (order_item_id) REFERENCES order_items(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_products_artist ON products(artist_id);
    CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
    CREATE INDEX IF NOT EXISTS idx_tiers_product ON product_tiers(product_id);
    CREATE INDEX IF NOT EXISTS idx_items_order ON order_items(order_id);
    CREATE INDEX IF NOT EXISTS idx_items_artist ON order_items(artist_id);

    -- ─── DISCOUNT CODES ──────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS discount_codes (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL COLLATE NOCASE,
      type TEXT NOT NULL,                      -- 'percent' | 'fixed'
      value INTEGER NOT NULL,                  -- percent: 25  | fixed: cents (e.g. 500 = 5€)
      artist_id TEXT,                          -- NULL = global, else restrict to this artist
      max_uses INTEGER,                        -- NULL = unlimited
      used_count INTEGER NOT NULL DEFAULT 0,
      expires_at TEXT,                         -- ISO 'YYYY-MM-DD HH:MM:SS' or NULL = no expiry
      enabled INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_discount_codes_code ON discount_codes(code);
    CREATE INDEX IF NOT EXISTS idx_discount_codes_artist ON discount_codes(artist_id);
  `);

  // Idempotent ALTERs for orders (add discount tracking)
  for (const alter of [
    "ALTER TABLE orders ADD COLUMN discount_code TEXT",
    "ALTER TABLE orders ADD COLUMN discount_amount_cents INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE order_items ADD COLUMN original_price_cents INTEGER",
  ]) {
    try { db.exec(alter); } catch { /* column already exists — ignore */ }
  }
}

// =========================================
// Play history
// =========================================
export function logTrack(
  artist: string,
  title: string,
  listenersStart: number
): void {
  const db = getDb();
  const now = new Date()
    .toLocaleString("sv-SE", { timeZone: "Europe/Paris" })
    .replace("T", " ");
  db.prepare(
    "INSERT INTO play_history (timestamp, artist, title, listeners_start) VALUES (?, ?, ?, ?)"
  ).run(now, artist, title, listenersStart);
}

export function getPlayHistory(limit = 50): PlayHistoryRow[] {
  return getDb()
    .prepare(
      "SELECT * FROM play_history ORDER BY timestamp DESC LIMIT ?"
    )
    .all(limit) as PlayHistoryRow[];
}

export function getPlayHistoryByRange(
  from: string,
  to: string
): PlayHistoryRow[] {
  return getDb()
    .prepare(
      "SELECT * FROM play_history WHERE timestamp BETWEEN ? AND ? ORDER BY timestamp DESC"
    )
    .all(from, to) as PlayHistoryRow[];
}

// =========================================
// Audience logs
// =========================================
export function recordAudience(
  listeners: number,
  peakListeners: number
): void {
  const db = getDb();
  const now = new Date()
    .toLocaleString("sv-SE", { timeZone: "Europe/Paris" })
    .replace("T", " ");
  db.prepare(
    "INSERT INTO audience_logs (timestamp, listeners, peak_listeners) VALUES (?, ?, ?)"
  ).run(now, listeners, peakListeners);
}

export function getAudienceLogs(limit = 200): AudienceLog[] {
  return getDb()
    .prepare(
      "SELECT * FROM audience_logs ORDER BY timestamp DESC LIMIT ?"
    )
    .all(limit) as AudienceLog[];
}

export function getAudienceByRange(from: string, to: string): AudienceLog[] {
  return getDb()
    .prepare(
      "SELECT * FROM audience_logs WHERE timestamp BETWEEN ? AND ? ORDER BY timestamp ASC"
    )
    .all(from, to) as AudienceLog[];
}

// =========================================
// Analytics summary
// =========================================
export function getTopArtists(limit = 10): { artist: string; plays: number }[] {
  return getDb()
    .prepare(
      `SELECT artist, COUNT(*) as plays FROM play_history
       GROUP BY artist ORDER BY plays DESC LIMIT ?`
    )
    .all(limit) as { artist: string; plays: number }[];
}

export function getTopTracks(
  limit = 10
): { artist: string; title: string; plays: number }[] {
  return getDb()
    .prepare(
      `SELECT artist, title, COUNT(*) as plays FROM play_history
       GROUP BY artist, title ORDER BY plays DESC LIMIT ?`
    )
    .all(limit) as { artist: string; title: string; plays: number }[];
}

// =========================================
// Audit log
// =========================================
export interface AuditLogRow {
  id: number;
  timestamp: string;
  user: string;
  action: string;
  target: string | null;
  ip: string | null;
}

export function writeAuditLog(
  user: string,
  action: string,
  target?: string,
  ip?: string
): void {
  const db = getDb();
  const now = new Date()
    .toLocaleString("sv-SE", { timeZone: "Europe/Paris" })
    .replace("T", " ");
  db.prepare(
    "INSERT INTO audit_log (timestamp, user, action, target, ip) VALUES (?, ?, ?, ?, ?)"
  ).run(now, user, action, target ?? null, ip ?? null);
}

export function getAuditLog(
  limit = 100,
  offset = 0,
  filterUser?: string
): AuditLogRow[] {
  const db = getDb();
  if (filterUser) {
    return db
      .prepare(
        "SELECT * FROM audit_log WHERE user = ? ORDER BY timestamp DESC LIMIT ? OFFSET ?"
      )
      .all(filterUser, limit, offset) as AuditLogRow[];
  }
  return db
    .prepare("SELECT * FROM audit_log ORDER BY timestamp DESC LIMIT ? OFFSET ?")
    .all(limit, offset) as AuditLogRow[];
}

export function getAuditLogCount(filterUser?: string): number {
  const db = getDb();
  const row = filterUser
    ? (db
        .prepare("SELECT COUNT(*) as c FROM audit_log WHERE user = ?")
        .get(filterUser) as { c: number })
    : (db.prepare("SELECT COUNT(*) as c FROM audit_log").get() as { c: number });
  return row?.c ?? 0;
}

// =========================================
// Data retention (called from /api/health)
// =========================================
export function pruneOldData(): { audiencePruned: number; historyPruned: number } {
  const db = getDb();
  const audienceResult = db
    .prepare("DELETE FROM audience_logs WHERE timestamp < datetime('now', '-90 days')")
    .run();
  const historyResult = db
    .prepare("DELETE FROM play_history WHERE timestamp < datetime('now', '-365 days')")
    .run();
  return {
    audiencePruned: audienceResult.changes,
    historyPruned: historyResult.changes,
  };
}

// Expose raw db for direct queries (analytics route)
export function rawDb(): Database.Database {
  return getDb();
}
