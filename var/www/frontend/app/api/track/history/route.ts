import { NextRequest, NextResponse } from "next/server";
import { getPlayHistory } from "@/lib/db";

function relativeTime(timestamp: string): string {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return "il y a quelques secondes";
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)}h`;
  return `il y a ${Math.floor(diff / 86400)}j`;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10), 200);

  const history = getPlayHistory(limit);
  const formatted = history.map((row) => ({
    display: `${row.artist} - ${row.title}`,
    relative_time: relativeTime(row.timestamp),
    artist: row.artist,
    title: row.title,
    timestamp: row.timestamp,
  }));
  return NextResponse.json({ success: true, history: formatted });
}
