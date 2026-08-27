import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { runScan } from "@/lib/scan";

export const dynamic = "force-dynamic";

/**
 * POST /api/releases/scan
 * POST /api/releases/scan?artist={id}  — single-artist test
 * Auth: admin session
 */
export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ status: "error", message: "Non autorisé." }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const filterArtistId = searchParams.get("artist");

  const result = await runScan(filterArtistId);

  return NextResponse.json({ status: "success", ...result });
}

