// Admin: list + create discount codes.
// Artist: list + create their own codes (forced to their artist_id).
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { listDiscounts, createDiscount, getDiscountByCode } from "@/lib/discounts";
import { parseBody, discountCreateSchema } from "@/lib/validation";

async function requireUser() {
  const session = await getSession();
  if (!session.logged_in || (session.role !== "admin" && session.role !== "artist")) return null;
  return session;
}

export async function GET() {
  const session = await requireUser();
  if (!session) return NextResponse.json({ status: "error", message: "Non autorisé" }, { status: 401 });
  const all = listDiscounts();
  // Artists only see their own codes
  const data = session.role === "artist"
    ? all.filter((d) => d.artist_id === session.artist_id)
    : all;
  return NextResponse.json({ status: "success", data });
}

export async function POST(req: NextRequest) {
  const session = await requireUser();
  if (!session) return NextResponse.json({ status: "error", message: "Non autorisé" }, { status: 401 });

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ status: "error", message: "Requête invalide." }, { status: 400 }); }

  const parsed = parseBody(discountCreateSchema, body);
  if (!parsed.success) {
    return NextResponse.json({ status: "error", message: parsed.error }, { status: 400 });
  }

  // Force artist scope for non-admin users (they can only create codes for their own prods)
  if (session.role === "artist") {
    if (!session.artist_id) {
      return NextResponse.json({ status: "error", message: "Accès refusé" }, { status: 403 });
    }
    parsed.data.artist_id = session.artist_id;
  }

  // Unique code check (case-insensitive)
  if (getDiscountByCode(parsed.data.code)) {
    return NextResponse.json({ status: "error", message: "Ce code existe déjà." }, { status: 409 });
  }

  const created = createDiscount(parsed.data);
  return NextResponse.json({ status: "success", data: created });
}
