import { NextResponse } from "next/server";
import { getCurrentTrackInfo, getDurationCache, saveDurationCache } from "@/lib/data";
import { getAudioDuration } from "@/lib/shell";
import { PATHS } from "@/lib/paths";
import path from "path";

export async function GET() {
  const trackInfo = getCurrentTrackInfo();

  if (!trackInfo) {
    return NextResponse.json(
      { error: "No track info available", server_now: Math.floor(Date.now() / 1000) },
      { status: 200 }
    );
  }

  const { filename, start_time } = trackInfo;

  // Parse artist/title from filename: "Artist - Song Title.mp3"
  const base = path.basename(filename, path.extname(filename));
  const dashIdx = base.indexOf(" - ");
  const artist = dashIdx !== -1 ? base.substring(0, dashIdx) : "Unknown";
  const title = dashIdx !== -1 ? base.substring(dashIdx + 3) : base;

  // Duration via cache
  let duration: number | null = null;
  const cache = getDurationCache();
  if (cache[filename] !== undefined) {
    duration = cache[filename];
  } else {
    const fullPath = path.join(PATHS.MUSIC_DIR, filename);
    duration = await getAudioDuration(fullPath);
    if (duration !== null) {
      cache[filename] = duration;
      saveDurationCache(cache);
    }
  }

  const serverNow = Math.floor(Date.now() / 1000);
  const adjustedStart = start_time + PATHS.ICECAST_BUFFER_DELAY;
  const elapsed = Math.max(0, serverNow - adjustedStart);
  const remaining = duration !== null ? Math.max(0, duration - elapsed) : null;

  return NextResponse.json({
    filename,
    artist,
    title,
    display_title: `${artist} - ${title}`,
    start_time: adjustedStart,
    duration,
    elapsed,
    remaining,
    server_now: serverNow,
    buffer_delay: PATHS.ICECAST_BUFFER_DELAY,
  });
}
