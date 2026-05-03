import { NextRequest, NextResponse } from "next/server";
import { recordAudience } from "@/lib/db";
import { getIcecastListeners } from "@/lib/shell";
import { getIronSession } from "iron-session";
import { sessionOptions } from "@/lib/session";
import type { SessionData } from "@/types";

const ICECAST_URL =
  process.env.ICECAST_URL ?? "http://localhost:8000/status-json.xsl";

export async function POST(req: NextRequest) {
  // Auth : session admin OU Authorization: Bearer $CRON_SECRET
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");
  const bearerToken = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;

  const hasCronAuth = cronSecret && bearerToken === cronSecret;

  if (!hasCronAuth) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const session = await getIronSession<SessionData>(req.cookies as any, sessionOptions);
    if (!session.logged_in) {
      return NextResponse.json(
        { status: "error", message: "Non autorisé." },
        { status: 401 }
      );
    }
  }

  try {
    const current = await getIcecastListeners(ICECAST_URL);
    recordAudience(current, current);
    return NextResponse.json({
      status: "success",
      message: "Audience enregistrée.",
      current,
    });
  } catch (err) {
    console.error("[audience/record]", err);
    return NextResponse.json(
      { status: "error", message: "Erreur lors de l'enregistrement." },
      { status: 500 }
    );
  }
}
