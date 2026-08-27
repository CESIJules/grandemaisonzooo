import { NextRequest, NextResponse } from "next/server";
import { updatePlaylist, deletePlaylist } from "@/lib/playlists";
import { requireAdmin } from "@/lib/auth";

type Params = { params: Promise<{ name: string }> };

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    await requireAdmin();
  } catch (res) {
    return res as Response;
  }

  const { name } = await params;
  const { songs, newName } = await req.json();
  const result = updatePlaylist(decodeURIComponent(name), songs, newName);
  return NextResponse.json(result, { status: result.status === "error" ? 404 : 200 });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    await requireAdmin();
  } catch (res) {
    return res as Response;
  }

  const { name } = await params;
  const result = deletePlaylist(decodeURIComponent(name));
  return NextResponse.json(result, { status: result.status === "error" ? 404 : 200 });
}
