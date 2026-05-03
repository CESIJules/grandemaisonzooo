import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions } from "@/lib/session";
import type { SessionData } from "@/types";

// Routes protected by admin role
const ADMIN_PATHS = /^\/admin(\/|$)/;

// ─── Rate limiting ────────────────────────────────────────────────────────────
// In-memory store: key → { count, resetAt }
// Runs in the Edge runtime per-instance; sufficient for single-server deploys.
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

const RATE_LIMIT_RULES: Array<{ pattern: RegExp; max: number; windowMs: number }> = [
  { pattern: /^\/api\/auth\/login$/,          max: 5,  windowMs: 60_000 },  // 5/min brute-force protection
  { pattern: /^\/api\/music\/download\//,     max: 2,  windowMs: 60_000 },  // 2/min yt-dlp / spotdl
  { pattern: /^\/api\/track\/skip$/,          max: 10, windowMs: 60_000 },  // 10/min DoS on Liquidsoap
  { pattern: /^\/api\/releases\/sync$/,       max: 3,  windowMs: 60_000 },  // 3/min sync releases
];

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

function checkRateLimit(ip: string, pathname: string): boolean {
  const rule = RATE_LIMIT_RULES.find((r) => r.pattern.test(pathname));
  if (!rule) return true;

  const key = `${ip}:${pathname}`;
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + rule.windowMs });
    return true;
  }

  if (entry.count >= rule.max) return false;

  entry.count += 1;
  return true;
}
// ─────────────────────────────────────────────────────────────────────────────

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const ip = getClientIp(req);

  // Rate limiting check (applies to all matched API routes)
  if (!checkRateLimit(ip, pathname)) {
    return NextResponse.json(
      { status: "error", message: "Trop de requêtes. Réessayez dans une minute." },
      { status: 429 }
    );
  }

  // Admin route protection
  if (!ADMIN_PATHS.test(pathname)) {
    return NextResponse.next();
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const session = await getIronSession<SessionData>(req.cookies as any, sessionOptions);

    if (!session.logged_in || session.role !== "admin") {
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
  matcher: [
    "/admin/:path*",
    "/api/auth/login",
    "/api/music/download/:path*",
    "/api/track/skip",
    "/api/releases/sync",
  ],
};
