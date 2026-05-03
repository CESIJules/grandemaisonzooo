import { NextRequest, NextResponse } from "next/server";
import { logTrack } from "@/lib/db";
import fs from "fs";
import { PATHS } from "@/lib/paths";

export async function POST(req: NextRequest) {
  const { artist, title, filename, listeners } = await req.json();

  if (!artist || !title) {
    return NextResponse.json(
      { status: "error", message: "artist et title requis" },
      { status: 400 }
    );
  }

  const listenersNum = typeof listeners === "number" ? listeners : parseInt(listeners ?? "0", 10);

  // Write track info to tmp for get_current_track
  if (filename) {
    const trackInfo = {
      filename: String(filename),
      start_time: Math.floor(Date.now() / 1000),
    };
    fs.writeFileSync(PATHS.TRACK_INFO_TMP, JSON.stringify(trackInfo));
  }

  logTrack(String(artist), String(title), isNaN(listenersNum) ? 0 : listenersNum);

  return NextResponse.json({ status: "success", message: "Track enregistré." });
}
