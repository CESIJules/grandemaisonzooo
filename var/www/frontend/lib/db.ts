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
    CREATE INDEX IF NOT EXISTS idx_audience_time ON audience_logs(timestamp);
    CREATE INDEX IF NOT EXISTS idx_history_time ON play_history(timestamp);
  `);
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
