import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import fs from "fs";
import path from "path";
import { PATHS } from "@/lib/paths";

const ALLOWED_AUDIO_EXT = new Set([".mp3", ".wav", ".flac", ".ogg", ".aac", ".m4a"]);
const MAX_SIZE_BYTES = 200 * 1024 * 1024; // 200 MB

// Magic bytes per format (first 4 bytes hex)
const AUDIO_MAGIC: Record<string, (hex: string) => boolean> = {
  ".mp3": (h) => h.startsWith("fff") || h.startsWith("id33") || h.startsWith("494433"), // ID3 tag or MPEG sync
  ".wav": (h) => h.startsWith("52494646"), // RIFF
  ".flac": (h) => h.startsWith("664c6143"), // fLaC
  ".ogg": (h) => h.startsWith("4f676753"), // OggS
  ".aac": (h) => h.startsWith("fff") || h.startsWith("4d346120"),
  ".m4a": (h) => h.slice(8, 16) === "6674797066", // ftyp (offset 4)
};

function validateAudioMagicBytes(buf: Buffer, ext: string): boolean {
  const hex = buf.slice(0, 6).toString("hex");
  const check = AUDIO_MAGIC[ext];
  if (!check) return false;
  return check(hex);
}

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

  if (!validateAudioMagicBytes(buf, ext)) {
    return NextResponse.json(
      { status: "error", message: "Le fichier ne correspond pas au format audio attendu." },
      { status: 400 }
    );
  }

  fs.writeFileSync(destPath, buf);

  return NextResponse.json({
    status: "success",
    message: "Fichier uploadé.",
    filename: safeName,
  });
}
