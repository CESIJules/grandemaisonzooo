import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { requireAdmin } from "@/lib/auth";
import { getPlaylistData, savePlaylistData } from "@/lib/data";

const COVERS_DIR = "/var/www/html/covers";

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
  } catch (res) {
    return res as Response;
  }

  const { name, cover } = await req.json();

  if (!name) {
    return NextResponse.json({ status: "error", message: "Nom de playlist requis" }, { status: 400 });
  }
  if (!cover || !cover.startsWith("data:image")) {
    return NextResponse.json({ status: "error", message: "Image invalide" }, { status: 400 });
  }

  if (!fs.existsSync(COVERS_DIR)) {
    fs.mkdirSync(COVERS_DIR, { recursive: true });
  }

  const base64Data = cover.replace(/^data:image\/\w+;base64,/, "");
  const imgBuffer = Buffer.from(base64Data, "base64");
  const safeName = name.replace(/[^a-z0-9]/gi, "_");
  const coverFilename = `${safeName}_${Date.now()}.jpg`;
  const coverFullPath = path.join(COVERS_DIR, coverFilename);

  if (!coverFullPath.startsWith(COVERS_DIR)) {
    return NextResponse.json({ status: "error", message: "Chemin invalide" }, { status: 400 });
  }

  fs.writeFileSync(coverFullPath, imgBuffer);
  const coverPath = `covers/${coverFilename}`;

  // Update playlist
  const data = getPlaylistData();
  const idx = data.playlists.findIndex((p) => p.name === name);
  if (idx === -1) {
    return NextResponse.json({ status: "error", message: "Playlist introuvable" }, { status: 404 });
  }
  data.playlists[idx].cover = coverPath;
  savePlaylistData(data);

  return NextResponse.json({ status: "success", coverPath });
}
