import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getCandidates } from "@/lib/data";

export const dynamic = "force-dynamic";

/**
 * GET /api/releases/candidates?status=pending|ignored|all
 */
export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ status: "error", message: "Non autorisé." }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? "pending";

  let candidates = getCandidates();
  if (status !== "all") {
    candidates = candidates.filter((c) => c.status === status);
  }

  // Sort: pending first, then by date desc
  candidates.sort((a, b) => {
    if (a.status !== b.status) return a.status === "pending" ? -1 : 1;
    return b.date.localeCompare(a.date);
  });

  return NextResponse.json({ status: "success", candidates });
}
