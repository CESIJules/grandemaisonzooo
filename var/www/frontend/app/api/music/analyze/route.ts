import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import { PATHS } from "@/lib/paths";

const execFileAsync = promisify(execFile);

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
  } catch (res) {
    return res as Response;
  }

  const { filename } = await req.json();

  if (!filename || typeof filename !== "string") {
    return NextResponse.json(
      { status: "error", message: "Nom de fichier requis" },
      { status: 400 }
    );
  }

  const safe = path.basename(filename);
  const filePath = path.join(PATHS.MUSIC_DIR, safe);

  if (!filePath.startsWith(PATHS.MUSIC_DIR)) {
    return NextResponse.json(
      { status: "error", message: "Chemin invalide" },
      { status: 400 }
    );
  }

  const scriptPath = path.join(
    path.dirname(PATHS.MUSIC_DIR),
    "analyze_audio_light.py"
  );

  try {
    const { stdout, stderr } = await execFileAsync("python3", [
      scriptPath,
      filePath,
    ]);
    return NextResponse.json({
      status: "success",
      output: stdout,
      stderr,
    });
  } catch (err) {
    console.error("[music/analyze]", err);
    return NextResponse.json(
      { status: "error", message: "Erreur lors de l'analyse audio." },
      { status: 500 }
    );
  }
}
