import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import fs from "fs";
import path from "path";
import { PATHS } from "@/lib/paths";

export async function DELETE(req: NextRequest) {
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

  // Prevent path traversal
  const safe = path.basename(filename);
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

  fs.unlinkSync(filePath);
  return NextResponse.json({ status: "success", message: "Fichier supprimé." });
}

// Also accept POST for backwards compatibility with admin.js
export async function POST(req: NextRequest) {
  return DELETE(req);
}
