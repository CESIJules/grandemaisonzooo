// Admin-only: list + create users.
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, hashPassword } from "@/lib/auth";
import { getUsers, saveUsers } from "@/lib/data";
import type { UsersJson } from "@/types";

export async function GET() {
  try {
    await requireAdmin();
  } catch (e) {
    return e instanceof Response ? e : NextResponse.json({ status: "error" }, { status: 401 });
  }
  const users = getUsers();
  const data = Object.entries(users).map(([username, u]) => ({
    username,
    role: u.role,
    artist_id: u.artist_id ?? null,
  }));
  return NextResponse.json({ status: "success", data });
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
  } catch (e) {
    return e instanceof Response ? e : NextResponse.json({ status: "error" }, { status: 401 });
  }

  let body: { username?: string; password?: string; role?: string; artist_id?: string | null };
  try { body = await req.json(); }
  catch { return NextResponse.json({ status: "error", message: "Requête invalide." }, { status: 400 }); }

  const username = (body.username ?? "").trim();
  const password = body.password ?? "";
  const role = body.role === "admin" ? "admin" : body.role === "artist" ? "artist" : null;
  const artist_id = role === "admin" ? null : (body.artist_id ?? null);

  if (!username || !/^[a-zA-Z0-9_.-]{2,40}$/.test(username)) {
    return NextResponse.json({ status: "error", message: "Nom d'utilisateur invalide." }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ status: "error", message: "Mot de passe trop court (min 6)." }, { status: 400 });
  }
  if (!role) {
    return NextResponse.json({ status: "error", message: "Rôle invalide." }, { status: 400 });
  }
  if (role === "artist" && !artist_id) {
    return NextResponse.json({ status: "error", message: "artist_id requis pour un compte artiste." }, { status: 400 });
  }

  const users = getUsers();
  const lower = username.toLowerCase();
  if (Object.keys(users).some((u) => u.toLowerCase() === lower)) {
    return NextResponse.json({ status: "error", message: "Cet utilisateur existe déjà." }, { status: 409 });
  }

  users[username] = {
    password_hash: await hashPassword(password),
    role,
    artist_id,
  };
  saveUsers(users as UsersJson);
  return NextResponse.json({ status: "success", data: { username, role, artist_id } });
}
