import { NextRequest, NextResponse } from "next/server";
import {
  getAllPlaylists,
  createPlaylist,
} from "@/lib/playlists";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  const result = getAllPlaylists();
  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
  } catch (res) {
    return res as Response;
  }

  try {
    const { name, songs, color, icon, cover } = await req.json();
    if (!name) {
      return NextResponse.json(
        { status: "error", message: "Nom de playlist requis" },
        { status: 400 }
      );
    }
    const result = createPlaylist(name, songs, color, icon, cover);
    const statusCode = result.status === "success" ? 201 : 409;
    return NextResponse.json(result, { status: statusCode });
  } catch (err) {
    console.error("[playlists]", err);
    return NextResponse.json({ status: "error", message: "Une erreur interne est survenue." }, { status: 500 });
  }
}
