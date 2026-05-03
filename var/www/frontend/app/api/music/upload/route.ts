import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import fs from "fs";
import path from "path";
import { PATHS } from "@/lib/paths";

const ALLOWED_AUDIO_EXT = new Set([".mp3", ".wav", ".flac", ".ogg", ".aac", ".m4a"]);
const MAX_SIZE_BYTES = 200 * 1024 * 1024; // 200 MB

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
  } catch (res) {
    return res as Response;
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json(
      { status: "error", message: "Aucun fichier fourni" },
      { status: 400 }
    );
  }

  const ext = path.extname(file.name).toLowerCase();
  if (!ALLOWED_AUDIO_EXT.has(ext)) {
    return NextResponse.json(
      { status: "error", message: "Extension non autorisée" },
      { status: 400 }
    );
  }

  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json(
      { status: "error", message: "Fichier trop volumineux (200 MB max)" },
      { status: 400 }
    );
  }

  const safeName = path.basename(file.name);
  const destPath = path.join(PATHS.MUSIC_DIR, safeName);

  if (!destPath.startsWith(PATHS.MUSIC_DIR)) {
    return NextResponse.json(
      { status: "error", message: "Chemin invalide" },
      { status: 400 }
    );
  }

  const buf = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(destPath, buf);

  return NextResponse.json({
    status: "success",
    message: "Fichier uploadé.",
    filename: safeName,
  });
}
