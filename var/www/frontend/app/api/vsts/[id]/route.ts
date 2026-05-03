import { NextRequest, NextResponse } from "next/server";
import { getVsts, updateVst, deleteVst } from "@/lib/data";
import { requireAdmin } from "@/lib/auth";

// ─── GET /api/vsts/[id] — public ──────────────────────────────────────────────

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const vst = getVsts().find((v) => v.id === Number(id));
  if (!vst) return NextResponse.json({ status: "error", message: "Introuvable" }, { status: 404 });
  return NextResponse.json(vst);
}

// ─── PUT /api/vsts/[id] — admin only ──────────────────────────────────────────

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
  } catch (res) {
    return res as Response;
  }

  const { id } = await params;
  try {
    const updates = await req.json();
    const updated = updateVst(Number(id), updates);
    if (!updated) return NextResponse.json({ status: "error", message: "Introuvable" }, { status: 404 });
    return NextResponse.json({ status: "success", message: "VST mis à jour.", data: updated });
  } catch (err) {
    console.error("[PUT /api/vsts/[id]]", err);
    return NextResponse.json({ status: "error", message: "Erreur serveur" }, { status: 500 });
  }
}

// ─── DELETE /api/vsts/[id] — admin only ───────────────────────────────────────

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
  } catch (res) {
    return res as Response;
  }

  const { id } = await params;
  const ok = deleteVst(Number(id));
  if (!ok) return NextResponse.json({ status: "error", message: "Introuvable" }, { status: 404 });
  return NextResponse.json({ status: "success", message: "VST supprimé." });
}
