import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getCandidateById, updateCandidate, ignoreCandidate } from "@/lib/data";

export const dynamic = "force-dynamic";

interface Params {
  params: Promise<{ id: string }>;
}

/**
 * PATCH /api/releases/candidates/[id]
 * Allowed fields: listenLink, watchLink, customImage, title, date
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ status: "error", message: "Non autorisé." }, { status: 401 });
  }

  const { id } = await params;
  const candidate = getCandidateById(id);
  if (!candidate) {
    return NextResponse.json({ status: "error", message: "Candidate introuvable." }, { status: 404 });
  }

  const body = await req.json() as Record<string, unknown>;
  const allowed = ["listenLink", "watchLink", "customImage", "title", "date"];
  const updates: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) updates[key] = body[key];
  }

  const updated = updateCandidate(id, updates);
  return NextResponse.json({ status: "success", candidate: updated });
}

/**
 * DELETE /api/releases/candidates/[id]
 * Sets status to "ignored" (soft delete).
 */
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ status: "error", message: "Non autorisé." }, { status: 401 });
  }

  const { id } = await params;
  const ok = ignoreCandidate(id);
  if (!ok) {
    return NextResponse.json({ status: "error", message: "Candidate introuvable." }, { status: 404 });
  }

  return NextResponse.json({ status: "success", message: "Candidate ignoré." });
}
