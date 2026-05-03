import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import fs from "fs";
import path from "path";
import { PATHS } from "@/lib/paths";

const ALLOWED_AUDIO_EXT = new Set([".mp3", ".wav", ".flac", ".ogg", ".aac", ".m4a"]);

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
  } catch (res) {
    return res as Response;
  }

  const body = await req.json();
  // Accept both camelCase and snake_case field names
  const oldFilename = body.oldFilename ?? body.old_name;
  const newFilename = body.newFilename ?? body.new_name;

  if (!oldFilename || !newFilename) {
    return NextResponse.json(
      { status: "error", message: "Anciens et nouveau noms de fichier requis" },
      { status: 400 }
    );
  }

  const oldSafe = path.basename(oldFilename);
  const newSafe = path.basename(newFilename);
  const ext = path.extname(newSafe).toLowerCase();

  if (!ALLOWED_AUDIO_EXT.has(ext)) {
    return NextResponse.json(
      { status: "error", message: "Extension non autorisée" },
      { status: 400 }
    );
  }

  const oldPath = path.join(PATHS.MUSIC_DIR, oldSafe);
  const newPath = path.join(PATHS.MUSIC_DIR, newSafe);

  if (!oldPath.startsWith(PATHS.MUSIC_DIR) || !newPath.startsWith(PATHS.MUSIC_DIR)) {
    return NextResponse.json(
      { status: "error", message: "Chemin invalide" },
      { status: 400 }
    );
  }

  if (!fs.existsSync(oldPath)) {
    return NextResponse.json(
      { status: "error", message: "Fichier source introuvable" },
      { status: 404 }
    );
  }

  if (fs.existsSync(newPath)) {
    return NextResponse.json(
      { status: "error", message: "Un fichier avec ce nom existe déjà" },
      { status: 409 }
    );
  }

  fs.renameSync(oldPath, newPath);
  return NextResponse.json({
    status: "success",
    message: "Fichier renommé.",
    oldFilename: oldSafe,
    newFilename: newSafe,
  });
}
