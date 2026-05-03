import { NextResponse } from "next/server";
import { sendLiquidsoapCommand } from "@/lib/liquidsoap";

export const dynamic = "force-dynamic";

/**
 * GET /api/track/queue
 * Returns the upcoming tracks from Liquidsoap's request queue.
 */
export async function GET() {
  try {
    // request.queue returns a space-separated list of request IDs
    const queueIds = await sendLiquidsoapCommand("request.queue");
    const ids = queueIds.split(/\s+/).filter(Boolean).slice(0, 10);

    if (ids.length === 0) {
      return NextResponse.json({ status: "success", data: [] });
    }

    // Resolve each request ID to its metadata
    const tracks = await Promise.all(
      ids.map(async (id) => {
        try {
          const metadata = await sendLiquidsoapCommand(`request.metadata ${id}`);
          const filenameMatch = metadata.match(/filename="?([^"\n]+)"?/);
          const titleMatch = metadata.match(/title="?([^"\n]+)"?/);
          const artistMatch = metadata.match(/artist="?([^"\n]+)"?/);
          const filename = filenameMatch?.[1] ?? "";
          const parts = filename.split("/").pop()?.replace(/\.(mp3|wav|flac|ogg|m4a|aac)$/i, "") ?? "";
          const [parsedArtist, parsedTitle] = parts.includes(" - ")
            ? parts.split(" - ", 2)
            : ["", parts];
          return {
            id,
            filename,
            artist: artistMatch?.[1] ?? parsedArtist,
            title: titleMatch?.[1] ?? parsedTitle,
          };
        } catch {
          return { id, filename: "", artist: "", title: "" };
        }
      })
    );

    return NextResponse.json({ status: "success", data: tracks });
  } catch (err) {
    console.error("[track/queue]", err);
    return NextResponse.json(
      { status: "error", message: "Impossible de récupérer la queue." },
      { status: 503 }
    );
  }
}
