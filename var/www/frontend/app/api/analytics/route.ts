import { NextRequest, NextResponse } from "next/server";
import { rawDb } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") ?? "";
  const range = searchParams.get("range") ?? "24h";

  try {
    switch (type) {
      case "stats_header": {
        const db = rawDb();
        const peak30d = (db.prepare(`SELECT MAX(listeners) as v FROM audience_logs WHERE timestamp > datetime('now', '-30 days')`).get() as { v: number | null })?.v ?? 0;
        const avg24h = (db.prepare(`SELECT AVG(listeners) as v FROM audience_logs WHERE timestamp > datetime('now', '-1 day')`).get() as { v: number | null })?.v ?? 0;
        const tracks24h = (db.prepare(`SELECT COUNT(*) as v FROM play_history WHERE timestamp > datetime('now', '-1 day')`).get() as { v: number })?.v ?? 0;
        const peakPrev30d = (db.prepare(`SELECT MAX(listeners) as v FROM audience_logs WHERE timestamp BETWEEN datetime('now', '-60 days') AND datetime('now', '-30 days')`).get() as { v: number | null })?.v ?? 0;
        const avgPrev24h = (db.prepare(`SELECT AVG(listeners) as v FROM audience_logs WHERE timestamp BETWEEN datetime('now', '-2 days') AND datetime('now', '-1 day')`).get() as { v: number | null })?.v ?? 0;
        const tracksPrev24h = (db.prepare(`SELECT COUNT(*) as v FROM play_history WHERE timestamp BETWEEN datetime('now', '-2 days') AND datetime('now', '-1 day')`).get() as { v: number })?.v ?? 0;
        return NextResponse.json({
          status: "success",
          data: {
            peak_30d: peak30d,
            avg_24h: Math.round((avg24h as number) * 10) / 10,
            tracks_24h: tracks24h,
            peak_prev_30d: peakPrev30d,
            avg_prev_24h: Math.round((avgPrev24h as number) * 10) / 10,
            tracks_prev_24h: tracksPrev24h,
          },
        });
      }

      case "audience": {
        const limit = range === "7d" ? 1008 : 144;
        const db = rawDb();
        const data = db
          .prepare(
            `SELECT * FROM (
              SELECT timestamp, listeners FROM audience_logs
              ORDER BY id DESC LIMIT ?
            ) ORDER BY timestamp ASC`
          )
          .all(limit);
        return NextResponse.json({ status: "success", data });
      }

      case "top_tracks": {
        const db = rawDb();
        const data = db
          .prepare(
            `SELECT artist, title, COUNT(*) as count
             FROM play_history
             WHERE timestamp > datetime('now', '-30 days')
             GROUP BY artist, title
             ORDER BY count DESC LIMIT 10`
          )
          .all();
        return NextResponse.json({ status: "success", data });
      }

      case "top_artists": {
        const db = rawDb();
        const data = db
          .prepare(
            `SELECT artist, COUNT(*) as count
             FROM play_history
             WHERE timestamp > datetime('now', '-30 days')
             GROUP BY artist
             ORDER BY count DESC LIMIT 10`
          )
          .all();
        return NextResponse.json({ status: "success", data });
      }

      case "heatmap": {
        const db = rawDb();
        const data = db
          .prepare(
            `SELECT
               strftime('%w', timestamp) as day_of_week,
               strftime('%H', timestamp) as hour_of_day,
               AVG(listeners) as avg_listeners
             FROM audience_logs
             WHERE timestamp > datetime('now', '-30 days')
             GROUP BY day_of_week, hour_of_day`
          )
          .all();
        return NextResponse.json({ status: "success", data });
      }

      case "recent_plays": {
        const limit = parseInt(searchParams.get("limit") ?? "20", 10);
        const db = rawDb();
        const data = db
          .prepare(
            `SELECT * FROM play_history ORDER BY timestamp DESC LIMIT ?`
          )
          .all(Math.min(limit, 100));
        return NextResponse.json({ status: "success", data });
      }

      default:
        return NextResponse.json(
          { status: "error", message: "Type d'analytique invalide" },
          { status: 400 }
        );
    }
  } catch (err) {
    console.error("[analytics]", err);
    return NextResponse.json(
      { status: "error", message: "Une erreur interne est survenue." },
      { status: 500 }
    );
  }
}
