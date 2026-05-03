import { NextResponse } from "next/server";
import { recordAudience } from "@/lib/db";
import { getIcecastListeners } from "@/lib/shell";

const ICECAST_URL =
  process.env.ICECAST_URL ?? "http://localhost:8000/status-json.xsl";

export async function POST() {
  try {
    const current = await getIcecastListeners(ICECAST_URL);
    recordAudience(current, current);
    return NextResponse.json({
      status: "success",
      message: "Audience enregistrée.",
      current,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erreur inconnue";
    return NextResponse.json(
      { status: "error", message: msg },
      { status: 500 }
    );
  }
}
