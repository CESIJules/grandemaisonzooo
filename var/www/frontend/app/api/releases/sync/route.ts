import { NextRequest, NextResponse } from "next/server";
import { getCandidates, publishCandidate } from "@/lib/data";
import { runScan } from "@/lib/scan";

export const dynamic = "force-dynamic";

/**
 * POST /api/releases/sync
 * Cron-only endpoint. Auth: Bearer CRON_SECRET.
 * Scans all sources then auto-publishes every pending candidate.
 */
export async function POST(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json(
      { status: "error", message: "CRON_SECRET non configuré." },
      { status: 500 }
    );
  }

  const authHeader = req.headers.get("authorization");
  const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (bearer !== cronSecret) {
    return NextResponse.json({ status: "error", message: "Non autorisé." }, { status: 401 });
  }

  const errors: string[] = [];

  // Step 1: scan all sources
  try {
    const scanResult = await runScan();
    errors.push(...scanResult.errors);
  } catch (err) {
    errors.push(`Scan erreur: ${String(err)}`);
  }

  // Step 2: auto-publish all pending candidates
  const pending = getCandidates().filter((c) => c.status === "pending");
  let added = 0;
  let skipped = 0;

  for (const candidate of pending) {
    try {
      const post = publishCandidate(candidate.id);
      if (post) {
        added++;
      } else {
        skipped++;
      }
    } catch (err) {
      errors.push(`Publish [${candidate.title}]: ${String(err)}`);
      skipped++;
    }
  }

  return NextResponse.json({
    status: "success",
    added,
    skipped,
    errors,
  });
}
