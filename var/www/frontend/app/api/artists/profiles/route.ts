import { NextRequest, NextResponse } from "next/server";
import { getArtistProfiles, saveArtistProfiles } from "@/lib/data";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  const profiles = getArtistProfiles();
  return NextResponse.json(profiles);
}

export async function PUT(req: NextRequest) {
  try {
    await requireAdmin();
  } catch (res) {
    return res as Response;
  }

  try {
    const profiles = await req.json();
    saveArtistProfiles(profiles);
    return NextResponse.json({
      status: "success",
      message: "Profils artistes sauvegardés.",
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erreur inconnue";
    return NextResponse.json(
      { status: "error", message: msg },
      { status: 500 }
    );
  }
}
