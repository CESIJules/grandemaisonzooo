import { NextRequest, NextResponse } from "next/server";
import { getAudioMetadata } from "@/lib/shell";
import path from "path";
import { PATHS } from "@/lib/paths";

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

  try {
    const metadata = await getAudioMetadata(filePath);
    return NextResponse.json({ status: "success", data: metadata });
  } catch (err) {
    console.error("[music/metadata]", err);
    return NextResponse.json(
      { status: "error", message: "Erreur lors de la lecture des métadonnées." },
      { status: 500 }
    );
  }
}
