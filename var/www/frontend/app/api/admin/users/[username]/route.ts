// Admin-only: update + delete a user.
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, hashPassword } from "@/lib/auth";
import { getUsers, saveUsers } from "@/lib/data";
import type { UsersJson } from "@/types";

function findKey(users: UsersJson, username: string): string | undefined {
  const lower = username.toLowerCase();
  return Object.keys(users).find((u) => u.toLowerCase() === lower);
}

export async function PUT(
  req: NextRequest,
  ctx: { params: Promise<{ username: string }> }
) {
  let session;
  try {
    session = await requireAdmin();
  } catch (e) {
    return e instanceof Response ? e : NextResponse.json({ status: "error" }, { status: 401 });
  }

  const { username } = await ctx.params;
  let body: { password?: string; role?: string; artist_id?: string | null };
  try { body = await req.json(); }
  catch { return NextResponse.json({ status: "error", message: "Requête invalide." }, { status: 400 }); }

  const users = getUsers();
  const key = findKey(users, username);
  if (!key) {
    return NextResponse.json({ status: "error", message: "Utilisateur introuvable." }, { status: 404 });
  }

  const user = users[key];

  if (body.password !== undefined) {
    if (body.password.length < 6) {
      return NextResponse.json({ status: "error", message: "Mot de passe trop court (min 6)." }, { status: 400 });
    }
    user.password_hash = await hashPassword(body.password);
  }

  if (body.role !== undefined) {
    if (body.role !== "admin" && body.role !== "artist") {
      return NextResponse.json({ status: "error", message: "Rôle invalide." }, { status: 400 });
    }
    // Prevent self-demotion
    if (key.toLowerCase() === session.user_id.toLowerCase() && body.role !== "admin") {
      return NextResponse.json({ status: "error", message: "Vous ne pouvez pas changer votre propre rôle." }, { status: 400 });
    }
    user.role = body.role;
    if (body.role === "admin") user.artist_id = null;
  }

  if (body.artist_id !== undefined && user.role === "artist") {
    if (!body.artist_id) {
      return NextResponse.json({ status: "error", message: "artist_id requis pour un compte artiste." }, { status: 400 });
    }
    user.artist_id = body.artist_id;
  }

  users[key] = user;
  saveUsers(users as UsersJson);
  return NextResponse.json({
    status: "success",
    data: { username: key, role: user.role, artist_id: user.artist_id ?? null },
  });
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ username: string }> }
) {
  let session;
  try {
    session = await requireAdmin();
  } catch (e) {
    return e instanceof Response ? e : NextResponse.json({ status: "error" }, { status: 401 });
  }

  const { username } = await ctx.params;
  const users = getUsers();
  const key = findKey(users, username);
  if (!key) {
    return NextResponse.json({ status: "error", message: "Utilisateur introuvable." }, { status: 404 });
  }
  if (key.toLowerCase() === session.user_id.toLowerCase()) {
    return NextResponse.json({ status: "error", message: "Vous ne pouvez pas supprimer votre propre compte." }, { status: 400 });
  }
  delete users[key];
  saveUsers(users as UsersJson);
  return NextResponse.json({ status: "success" });
}
