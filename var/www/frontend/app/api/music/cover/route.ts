import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";
import { PATHS } from "@/lib/paths";

const execFileAsync = promisify(execFile);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const file = searchParams.get("file");

  if (!file) {
    return NextResponse.json(
      { status: "error", message: "Paramètre file requis" },
      { status: 400 }
    );
  }

  const safe = path.basename(file);
  const filePath = path.join(PATHS.MUSIC_DIR, safe);

  if (!filePath.startsWith(PATHS.MUSIC_DIR)) {
    return NextResponse.json(
      { status: "error", message: "Chemin invalide" },
      { status: 400 }
    );
  }

  if (!fs.existsSync(filePath)) {
    return NextResponse.json(
      { status: "error", message: "Fichier introuvable" },
      { status: 404 }
    );
  }

  try {
    const { stdout } = await execFileAsync("ffmpeg", [
      "-i",
      filePath,
      "-an",
      "-vcodec",
      "copy",
      "-f",
      "image2pipe",
      "pipe:1",
    ]);

    const buf = Buffer.from(stdout, "binary");
    return new NextResponse(buf, {
      status: 200,
      headers: { "Content-Type": "image/jpeg" },
    });
  } catch {
    return NextResponse.json(
      { status: "error", message: "Pas de couverture dans ce fichier" },
      { status: 404 }
    );
  }
}
