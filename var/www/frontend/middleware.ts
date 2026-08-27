import { NextRequest, NextResponse } from "next/server";
import { unsealData } from "iron-session";
import { sessionOptions } from "@/lib/session";
import type { SessionData } from "@/types";

// Routes protected by admin role
const ADMIN_PATHS = /^\/admin(\/|$)/;

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (!ADMIN_PATHS.test(pathname)) {
    return NextResponse.next();
  }

  try {
    const cookieValue = req.cookies.get(sessionOptions.cookieName)?.value;
    if (!cookieValue) throw new Error("No session cookie");

    const session = await unsealData<SessionData>(cookieValue, {
      password: sessionOptions.password as string,
    });

    // Allow both admin and artist roles to access /admin
    // (the admin UI hides admin-only tabs based on role; data APIs enforce per-action perms)
    const allowedRoles = ["admin", "artist"];
    if (!session.logged_in || !allowedRoles.includes(session.role as string)) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
  } catch {
    const loginUrl = new URL("/login", req.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
