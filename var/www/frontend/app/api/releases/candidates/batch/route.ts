import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { publishCandidate, ignoreCandidate, getCandidates } from "@/lib/data";

export const dynamic = "force-dynamic";

/**
 * POST /api/releases/candidates/batch
 * Body: { action: "publish" | "ignore", ids: string[] }
 */
export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ status: "error", message: "Non autorisé." }, { status: 401 });
  }

  const body = await req.json() as { action?: string; ids?: unknown };
  const action = body.action;
  const ids = Array.isArray(body.ids) ? (body.ids as string[]) : [];

  if (!action || !["publish", "ignore"].includes(action)) {
    return NextResponse.json(
      { status: "error", message: "action doit être \"publish\" ou \"ignore\"." },
      { status: 400 }
    );
  }
  if (ids.length === 0) {
    return NextResponse.json({ status: "error", message: "ids ne peut pas être vide." }, { status: 400 });
  }

  const results: { id: string; ok: boolean }[] = [];
  for (const id of ids) {
    if (action === "publish") {
      const post = publishCandidate(id);
      results.push({ id, ok: post !== null });
    } else {
      const ok = ignoreCandidate(id);
      results.push({ id, ok });
    }
  }

  const processed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok).length;
  const pending = getCandidates().filter((c) => c.status === "pending").length;

  return NextResponse.json({
    status: "success",
    processed,
    failed,
    pendingRemaining: pending,
  });
}
