import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export async function POST() {
  const session = await getSession();
  session.destroy();
  return NextResponse.json({ status: "success" });
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  session.destroy();
  // Build the redirect from forwarded headers because behind nginx
  // req.nextUrl.origin resolves to the upstream socket (localhost:3000).
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? req.nextUrl.host;
  const proto = req.headers.get("x-forwarded-proto") ?? req.nextUrl.protocol.replace(":", "");
  const loginUrl = `${proto}://${host}/login`;
  const res = NextResponse.redirect(loginUrl);
  // Prevent BFCache from restoring the admin page after going Back
  res.headers.set("Cache-Control", "no-store, max-age=0");
  return res;
}
