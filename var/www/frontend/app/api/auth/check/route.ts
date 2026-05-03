import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session.logged_in) {
    return NextResponse.json({ logged_in: false });
  }
  return NextResponse.json({
    logged_in: true,
    user_id: session.user_id,
    role: session.role,
    artist_id: session.artist_id,
  });
}
