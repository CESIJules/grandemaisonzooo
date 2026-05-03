import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import fs from "fs";
import path from "path";

const ALLOWED_IMAGE_EXT = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp"]);
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const UPLOADS_DIR = "/var/www/html/uploads/artists";

// Magic bytes per image format
const IMAGE_MAGIC: Record<string, (h: string) => boolean> = {
  ".jpg": (h) => h.startsWith("ffd8ff"),
  ".jpeg": (h) => h.startsWith("ffd8ff"),
  ".png": (h) => h.startsWith("89504e47"),
  ".gif": (h) => h.startsWith("474946383"),  // GIF87a or GIF89a
  ".webp": (h) => h.slice(8, 16) === "57454250", // RIFF....WEBP (offset 8)
};

function validateImageMagicBytes(buf: Buffer, ext: string): boolean {
  const hex = buf.slice(0, 6).toString("hex");
  const check = IMAGE_MAGIC[ext];
  if (!check) return false;
  return check(hex);
}

export async function POST(req: NextRequest) {
  try {
    await requireAuth();
  } catch (res) {
    return res as Response;
  }

  const formData = await req.formData();
  // Accept both 'file' and 'image' field names
  const file = (formData.get("file") ?? formData.get("image")) as File | null;
  const artistId = formData.get("artist_id") as string | null;

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

  const safeName = artistId
    ? `${path.basename(artistId)}${ext}`
    : `${Date.now()}${ext}`;
  const destPath = path.join(UPLOADS_DIR, safeName);

  if (!destPath.startsWith(UPLOADS_DIR)) {
    return NextResponse.json(
      { status: "error", message: "Chemin invalide" },
      { status: 400 }
    );
  }

  const buf = Buffer.from(await file.arrayBuffer());

  if (!validateImageMagicBytes(buf, ext)) {
    return NextResponse.json(
      { status: "error", message: "Le fichier ne correspond pas au format image attendu." },
      { status: 400 }
    );
  }

  fs.writeFileSync(destPath, buf);

  return NextResponse.json({
    status: "success",
    message: "Image uploadée.",
    filename: safeName,
    url: `/uploads/artists/${safeName}`,
    filepath: `uploads/artists/${safeName}`,
  });
}
