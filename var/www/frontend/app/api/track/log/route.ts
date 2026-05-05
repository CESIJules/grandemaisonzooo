import { NextRequest, NextResponse } from "next/server";
import { logTrack } from "@/lib/db";
import fs from "fs";
import { PATHS } from "@/lib/paths";

export async function POST(req: NextRequest) {
  // Auth : Authorization: Bearer $LIQUIDSOAP_TOKEN
  const token = process.env.LIQUIDSOAP_TOKEN;
  if (token) {
    const auth = req.headers.get("authorization");
    const bearer = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
    if (bearer !== token) {
      return NextResponse.json(
        { status: "error", message: "Non autorisé." },
        { status: 401 }
      );
    }
  }

  const body = await req.json().catch(() => null);
  const { artist, title, filename, listeners } = body ?? {};

  // Liquidsoap url.encode() uses + for spaces — decode before storing
  const urlDecode = (s: unknown) =>
    decodeURIComponent(String(s ?? "").replace(/\+/g, " ")).trim();

  const decodedFilename = filename ? urlDecode(filename) : null;
  const decodedArtist   = urlDecode(artist);
  const decodedTitle    = urlDecode(title);

  if (!decodedArtist || !decodedTitle) {
    return NextResponse.json(
      { status: "error", message: "artist et title requis" },
      { status: 400 }
    );
  }

  const listenersNum = typeof listeners === "number" ? listeners : parseInt(listeners ?? "0", 10);

  // Write track info to tmp for get_current_track
  if (decodedFilename) {
    const trackInfo = {
      filename: decodedFilename,
      start_time: Math.floor(Date.now() / 1000),
    };
    try {
      fs.writeFileSync(PATHS.TRACK_INFO_TMP, JSON.stringify(trackInfo));
    } catch (err) {
      console.error("[track/log] Impossible d'écrire track_info_tmp:", err);
    }
  }

  logTrack(decodedArtist, decodedTitle, isNaN(listenersNum) ? 0 : listenersNum);

  return NextResponse.json({ status: "success", message: "Track enregistré." });
}
