import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { downloadYoutube } from "@/lib/shell";
import { PATHS } from "@/lib/paths";

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
  } catch (res) {
    return res as Response;
  }

  const { url } = await req.json();

  if (!url || typeof url !== "string") {
    return NextResponse.json(
      { status: "error", message: "URL YouTube requise" },
      { status: 400 }
    );
  }

  // Validate that it's a YouTube URL before passing to yt-dlp
  if (!/^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\//.test(url)) {
    return NextResponse.json(
      { status: "error", message: "URL YouTube invalide" },
      { status: 400 }
    );
  }

  try {
    const { stdout, stderr } = await downloadYoutube(url, PATHS.MUSIC_DIR);
    return NextResponse.json({
      status: "success",
      message: "Téléchargement terminé.",
      output: stdout,
      stderr,
    });
  } catch (err) {
    console.error("[music/download/youtube]", err);
    return NextResponse.json(
      { status: "error", message: "Erreur lors du téléchargement YouTube." },
      { status: 500 }
    );
  }
}
