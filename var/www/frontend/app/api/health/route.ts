import { NextResponse } from "next/server";
import { sendLiquidsoapCommand } from "@/lib/liquidsoap";
import { getAudienceLogs, rawDb, pruneOldData } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/health
 * Checks the health of all critical services and optionally prunes old data.
 * Public endpoint — returns minimal info without secrets.
 */
export async function GET() {
  const checks: Record<string, boolean | string> = {};

  // 1. Icecast
  try {
    const icecastUrl =
      process.env.ICECAST_URL ?? "http://localhost:8000/status-json.xsl";
    const res = await fetch(icecastUrl, {
      signal: AbortSignal.timeout(3000),
      cache: "no-store",
    });
    checks.icecast = res.ok;
  } catch {
    checks.icecast = false;
  }

  // 2. Liquidsoap telnet
  try {
    const resp = await sendLiquidsoapCommand("uptime");
    checks.liquidsoap = resp.length > 0;
  } catch {
    checks.liquidsoap = false;
  }

  // 3. SQLite analytics DB
  try {
    rawDb().prepare("SELECT 1").get();
    checks.database = true;
  } catch {
    checks.database = false;
  }

  // 4. Audience freshness (last record < 15 min ago)
  try {
    const logs = getAudienceLogs(1);
    if (logs.length > 0) {
      const lastTs = new Date(logs[0].timestamp).getTime();
      const ageMs = Date.now() - lastTs;
      checks.audience_fresh = ageMs < 15 * 60 * 1000;
    } else {
      checks.audience_fresh = false;
    }
  } catch {
    checks.audience_fresh = false;
  }

  const allHealthy = Object.values(checks).every((v) => v === true);

  return NextResponse.json(
    {
      status: allHealthy ? "healthy" : "degraded",
      checks,
      timestamp: new Date().toISOString(),
    },
    { status: allHealthy ? 200 : 503 }
  );
}

/**
 * POST /api/health/prune
 * Prunes old analytics data (requires admin session or CRON_SECRET).
 */
export async function POST(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");
  const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!cronSecret || bearer !== cronSecret) {
    return NextResponse.json({ status: "error", message: "Non autorisé." }, { status: 401 });
  }
  try {
    const result = pruneOldData();
    return NextResponse.json({ status: "success", ...result });
  } catch (err) {
    console.error("[health/prune]", err);
    return NextResponse.json({ status: "error", message: "Erreur lors du nettoyage." }, { status: 500 });
  }
}
