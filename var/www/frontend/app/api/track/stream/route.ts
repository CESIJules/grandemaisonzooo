import { NextResponse } from "next/server";
import { getCurrentTrackInfo, getDurationCache, saveDurationCache } from "@/lib/data";
import { getAudioDuration } from "@/lib/shell";
import { PATHS } from "@/lib/paths";
import path from "path";

export const dynamic = "force-dynamic";

/**
 * GET /api/track/stream
 * Server-Sent Events endpoint streaming current track updates.
 * Sends an event immediately then every 10 seconds or on track change.
 */
export async function GET() {
  const encoder = new TextEncoder();
  let closed = false;

  async function getTrackPayload(): Promise<string> {
    const trackInfo = getCurrentTrackInfo();
    const serverNow = Math.floor(Date.now() / 1000);

    if (!trackInfo) {
      return JSON.stringify({ error: "No track info", server_now: serverNow });
    }

    const { filename, start_time } = trackInfo;
    const base = path.basename(filename, path.extname(filename));
    const dashIdx = base.indexOf(" - ");
    const artist = dashIdx !== -1 ? base.substring(0, dashIdx) : "Unknown";
    const title = dashIdx !== -1 ? base.substring(dashIdx + 3) : base;

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

    const adjustedStart = start_time + PATHS.ICECAST_BUFFER_DELAY;
    const elapsed = Math.max(0, serverNow - adjustedStart);
    const remaining = duration !== null ? Math.max(0, duration - elapsed) : null;

    return JSON.stringify({
      filename,
      artist,
      title,
      display_title: `${artist} - ${title}`,
      start_time: adjustedStart,
      duration,
      elapsed,
      remaining,
      server_now: serverNow,
    });
  }

  const stream = new ReadableStream({
    async start(controller) {
      const send = async () => {
        if (closed) return;
        try {
          const payload = await getTrackPayload();
          controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
        } catch {
          // swallow — client will retry
        }
      };

      // Initial event
      await send();

      // Poll every 10 seconds
      const interval = setInterval(async () => {
        if (closed) {
          clearInterval(interval);
          return;
        }
        await send();
      }, 10_000);

      // Keep-alive comment every 25s to prevent proxy timeouts
      const keepAlive = setInterval(() => {
        if (closed) {
          clearInterval(keepAlive);
          return;
        }
        controller.enqueue(encoder.encode(": keep-alive\n\n"));
      }, 25_000);
    },
    cancel() {
      closed = true;
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // disable nginx buffering
    },
  });
}
