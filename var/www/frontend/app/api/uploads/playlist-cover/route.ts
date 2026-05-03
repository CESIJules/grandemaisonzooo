import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import fs from "fs";
import path from "path";

const ALLOWED_IMAGE_EXT = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp"]);
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const UPLOADS_DIR = "/var/www/html/uploads/playlists";

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
  } catch (res) {
    return res as Response;
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const playlistName = formData.get("playlist_name") as string | null;

  if (!file) {
    return NextResponse.json(
      { status: "error", message: "Aucun fichier fourni" },
      { status: 400 }
    );
  }

  const ext = path.extname(file.name).toLowerCase();
  if (!ALLOWED_IMAGE_EXT.has(ext)) {
    return NextResponse.json(
      { status: "error", message: "Extension image non autorisée" },
      { status: 400 }
    );
  }

  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json(
      { status: "error", message: "Fichier trop volumineux (10 MB max)" },
      { status: 400 }
    );
  }

  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }

  const safeName = playlistName
    ? `${path.basename(playlistName).replace(/\s+/g, "_")}${ext}`
    : `${Date.now()}${ext}`;
  const destPath = path.join(UPLOADS_DIR, safeName);

  if (!destPath.startsWith(UPLOADS_DIR)) {
    return NextResponse.json(
      { status: "error", message: "Chemin invalide" },
      { status: 400 }
    );
  }

  const buf = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(destPath, buf);

  return NextResponse.json({
    status: "success",
    message: "Couverture uploadée.",
    filename: safeName,
    url: `/uploads/playlists/${safeName}`,
  });
}
