import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getArtistPayouts, listSales } from "@/lib/shop";
import { isStripeLiveMode } from "@/lib/stripe";

export const dynamic = "force-dynamic";

// GET /api/shop/sales
//   Admin → returns ALL paid sales + payouts grouped by artist.
//   Artist → returns ONLY their own sales + their own payout total.
export async function GET() {
  const session = await getSession();
  if (!session.logged_in) {
    return NextResponse.json({ status: "error", message: "Non autorisé" }, { status: 401 });
  }

  const isAdmin = session.role === "admin";
  const artistId = isAdmin ? undefined : session.artist_id ?? "__none__";

  const sales = listSales({ artistId, limit: 300 });
  const payouts = getArtistPayouts(artistId);

  return NextResponse.json({
    status: "success",
    data: { sales, payouts, liveMode: isStripeLiveMode() },
  });
}
