import { NextRequest, NextResponse } from "next/server";
import { getShopConfig, saveShopConfig } from "@/lib/shop";
import { getSession, requireAdmin } from "@/lib/auth";
import { parseBody, shopConfigSchema } from "@/lib/validation";

// ─── GET /api/shop/config ──────────────────────────────────────────────────────
// Any authenticated user (artists need commission % + artistsCanSell flag).
export async function GET() {
  const session = await getSession();
  if (!session.logged_in) {
    return NextResponse.json({ status: "error", message: "Non autorisé" }, { status: 401 });
  }
  return NextResponse.json({ status: "success", data: getShopConfig() });
}

// ─── PUT /api/shop/config — admin only ──────────────────────────────────────────
export async function PUT(req: NextRequest) {
  try {
    await requireAdmin();
  } catch (res) {
    return res as Response;
  }
  try {
    const body = await req.json();
    const parsed = parseBody(shopConfigSchema, body);
    if (!parsed.success) {
      return NextResponse.json({ status: "error", message: parsed.error }, { status: 400 });
    }
    const saved = saveShopConfig(parsed.data);
    return NextResponse.json({ status: "success", message: "Configuration enregistrée.", data: saved });
  } catch (err) {
    console.error("[PUT /api/shop/config]", err);
    return NextResponse.json({ status: "error", message: "Erreur serveur" }, { status: 500 });
  }
}
