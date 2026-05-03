import { NextRequest, NextResponse } from "next/server";
import { setActivePlaylist } from "@/lib/playlists";
import { requireAdmin } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
  } catch (res) {
    return res as Response;
  }

  const { name } = await req.json();
  const result = setActivePlaylist(name ?? null);
  return NextResponse.json(result, { status: result.status === "error" ? 404 : 200 });
}
