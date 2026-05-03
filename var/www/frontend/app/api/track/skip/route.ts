import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { skipTrack } from "@/lib/liquidsoap";

export async function POST() {
  try {
    await requireAdmin();
  } catch (res) {
    return res as Response;
  }

  try {
    const response = await skipTrack();
    return NextResponse.json({
      status: "success",
      message: "Commande envoyée.",
      telnet_response: response,
    });
  } catch (err) {
    console.error("[track/skip]", err);
    return NextResponse.json(
      { status: "error", message: "Impossible de se connecter à Liquidsoap." },
      { status: 500 }
    );
  }
}
