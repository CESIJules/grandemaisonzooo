// Admin: update + delete any discount code.
// Artist: update + delete only their own codes (artist_id must match session.artist_id).
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDiscount, updateDiscount, deleteDiscount, getDiscountByCode } from "@/lib/discounts";
import { parseBody, discountUpdateSchema } from "@/lib/validation";
import type { DiscountCode, SessionData } from "@/types";

async function requireUser() {
  const session = await getSession();
  if (!session.logged_in || (session.role !== "admin" && session.role !== "artist")) return null;
  return session;
}

function canManage(session: SessionData, code: DiscountCode): boolean {
  if (session.role === "admin") return true;
  return session.role === "artist" && !!session.artist_id && code.artist_id === session.artist_id;
}

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await requireUser();
  if (!session) return NextResponse.json({ status: "error", message: "Non autorisé" }, { status: 401 });

  const { id } = await ctx.params;
  const existing = getDiscount(id);
  if (!existing) return NextResponse.json({ status: "error", message: "Code introuvable" }, { status: 404 });
  if (!canManage(session, existing)) {
    return NextResponse.json({ status: "error", message: "Accès refusé" }, { status: 403 });
  }

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ status: "error", message: "Requête invalide." }, { status: 400 }); }

  const parsed = parseBody(discountUpdateSchema, body);
  if (!parsed.success) {
    return NextResponse.json({ status: "error", message: parsed.error }, { status: 400 });
  }

  // Artists cannot reassign a code to another artist (or to global)
  if (session.role === "artist" && parsed.data.artist_id !== undefined) {
    parsed.data.artist_id = session.artist_id;
  }

  if (parsed.data.code && parsed.data.code.toLowerCase() !== existing.code.toLowerCase()) {
    if (getDiscountByCode(parsed.data.code)) {
      return NextResponse.json({ status: "error", message: "Ce code existe déjà." }, { status: 409 });
    }
  }

  const updated = updateDiscount(id, parsed.data);
  return NextResponse.json({ status: "success", data: updated });
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await requireUser();
  if (!session) return NextResponse.json({ status: "error", message: "Non autorisé" }, { status: 401 });

  const { id } = await ctx.params;
  const existing = getDiscount(id);
  if (!existing) return NextResponse.json({ status: "error", message: "Code introuvable" }, { status: 404 });
  if (!canManage(session, existing)) {
    return NextResponse.json({ status: "error", message: "Accès refusé" }, { status: 403 });
  }
  const ok = deleteDiscount(id);
  if (!ok) return NextResponse.json({ status: "error", message: "Code introuvable" }, { status: 404 });
  return NextResponse.json({ status: "success" });
}
