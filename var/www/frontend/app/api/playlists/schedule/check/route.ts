import { NextRequest, NextResponse } from "next/server";
import { getPlaylistData } from "@/lib/data";
import { setActivePlaylist } from "@/lib/playlists";

/**
 * POST /api/playlists/schedule/check
 * Called by cron every minute. Activates a scheduled playlist if its time matches.
 * Auth: Authorization: Bearer $CRON_SECRET
 */
export async function POST(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");
  const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!cronSecret || bearer !== cronSecret) {
    return NextResponse.json({ status: "error", message: "Non autorisé." }, { status: 401 });
  }

  const now = new Date();
  const currentDay = now.getDay();    // 0=dimanche … 6=samedi
  const currentHour = now.getHours(); // 0-23

  const data = getPlaylistData();
  const scheduled = data.playlists.find(
    (p) =>
      p.schedule?.enabled &&
      p.schedule.day === currentDay &&
      p.schedule.hour === currentHour
  );

  if (!scheduled) {
    return NextResponse.json({
      status: "success",
      message: "Aucune playlist programmée pour ce créneau.",
      activated: null,
    });
  }

  if (data.active_playlist === scheduled.name) {
    return NextResponse.json({
      status: "success",
      message: `Playlist '${scheduled.name}' déjà active.`,
      activated: null,
    });
  }

  try {
    const result = setActivePlaylist(scheduled.name);
    return NextResponse.json({
      status: result.status,
      message: result.message,
      activated: result.status === "success" ? scheduled.name : null,
    });
  } catch (err) {
    console.error("[playlists/schedule/check]", err);
    return NextResponse.json(
      { status: "error", message: "Erreur lors de l'activation de la playlist." },
      { status: 500 }
    );
  }
}
