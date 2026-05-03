import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { execFile } from "child_process";
import { promisify } from "util";
import { PATHS } from "@/lib/paths";

const execFileAsync = promisify(execFile);

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
  } catch (res) {
    return res as Response;
  }

  const { url } = await req.json();

  if (!url || typeof url !== "string") {
    return NextResponse.json(
      { status: "error", message: "URL Spotify requise" },
      { status: 400 }
    );
  }

  if (!/^https?:\/\/open\.spotify\.com\//.test(url)) {
    return NextResponse.json(
      { status: "error", message: "URL Spotify invalide" },
      { status: 400 }
    );
  }

  try {
    // spotdl outputs files to the current directory; redirect to music dir
    const { stdout, stderr } = await execFileAsync("spotdl", [
      "--output",
      PATHS.MUSIC_DIR,
      url,
    ]);
    return NextResponse.json({
      status: "success",
      message: "Téléchargement Spotify terminé.",
      output: stdout,
      stderr,
    });
  } catch (err) {
    console.error("[music/download/spotify]", err);
    return NextResponse.json(
      { status: "error", message: "Erreur lors du téléchargement Spotify." },
      { status: 500 }
    );
  }
}
