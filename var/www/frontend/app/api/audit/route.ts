import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getAuditLog, getAuditLogCount } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/audit?limit=50&offset=0&user=xxx
 * Returns paginated audit log entries. Admin only.
 */
export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
  } catch (res) {
    return res as Response;
  }

  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10), 200);
  const offset = Math.max(parseInt(searchParams.get("offset") ?? "0", 10), 0);
  const filterUser = searchParams.get("user") ?? undefined;

  const entries = getAuditLog(limit, offset, filterUser);
  const total = getAuditLogCount(filterUser);

  return NextResponse.json({
    status: "success",
    data: entries,
    pagination: { limit, offset, total },
  });
}
