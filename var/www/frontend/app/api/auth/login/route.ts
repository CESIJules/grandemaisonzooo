import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions } from "@/lib/session";
import { loginUser } from "@/lib/auth";
import { SessionData } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json(
        { status: "error", message: "Identifiants manquants" },
        { status: 400 }
      );
    }

    const sessionData = await loginUser(username as string, password as string);
    if (!sessionData) {
      return NextResponse.json(
        { status: "error", message: "Identifiants incorrects" },
        { status: 401 }
      );
    }

    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
    session.logged_in = sessionData.logged_in;
    session.user_id = sessionData.user_id;
    session.role = sessionData.role;
    session.artist_id = sessionData.artist_id;
    await session.save();

    return NextResponse.json({ status: "success" });
  } catch {
    return NextResponse.json(
      { status: "error", message: "Erreur serveur" },
      { status: 500 }
    );
  }
}
