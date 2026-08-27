import bcrypt from "bcryptjs";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions } from "./session";
import { getUsers, saveUsers } from "./data";
import { SessionData, UsersJson } from "@/types";

/**
 * Get the current session from the request cookies.
 * Used in API Route handlers.
 */
export async function getSession() {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}

/**
 * Attempt to log in a user. Returns session data on success, null on failure.
 */
export async function loginUser(
  username: string,
  password: string
): Promise<SessionData | null> {
  const users = getUsers();

  // Case-insensitive username lookup
  const key = Object.keys(users).find(
    (u) => u.toLowerCase() === username.toLowerCase()
  );
  if (!key) return null;

  const user = users[key];
  // Normalize PHP bcrypt prefix $2y$ → $2b$ (functionally identical, bcryptjs only accepts $2b$)
  const hash = user.password_hash.replace(/^\$2y\$/, "$2b$");
  const valid = await bcrypt.compare(password, hash);
  if (!valid) return null;

  return {
    logged_in: true,
    user_id: key,
    role: user.role,
    artist_id: user.artist_id,
  };
}

/**
 * Require admin role. Returns session if admin, throws 401 response otherwise.
 * Use inside API route handlers.
 */
export async function requireAdmin(): Promise<SessionData> {
  const session = await getSession();
  if (!session.logged_in || session.role !== "admin") {
    throw new Response(
      JSON.stringify({ status: "error", message: "Non autorisé" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }
  return session;
}

/**
 * Require any authenticated user. Throws 401 if not logged in.
 */
export async function requireAuth(): Promise<SessionData> {
  const session = await getSession();
  if (!session.logged_in) {
    throw new Response(
      JSON.stringify({ status: "error", message: "Non autorisé" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }
  return session;
}

/**
 * Require admin OR a logged-in artist whose artist_id matches `ownerArtistId`.
 * - admin: always allowed
 * - artist: allowed only if their artist_id === ownerArtistId
 * Throws 401 / 403 otherwise.
 */
export async function requireAdminOrOwner(
  ownerArtistId: string | null | undefined
): Promise<SessionData> {
  const session = await requireAuth();
  if (session.role === "admin") return session;
  if (session.role === "artist" && session.artist_id && ownerArtistId && session.artist_id === ownerArtistId) {
    return session;
  }
  throw new Response(
    JSON.stringify({ status: "error", message: "Accès refusé" }),
    { status: 403, headers: { "Content-Type": "application/json" } }
  );
}

/**
 * Hash a plain-text password (bcrypt, cost 12).
 */
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
}

/**
 * Update a user's password in users.json.
 */
export async function changePassword(
  username: string,
  newPassword: string
): Promise<boolean> {
  const users = getUsers();
  const key = Object.keys(users).find(
    (u) => u.toLowerCase() === username.toLowerCase()
  );
  if (!key) return false;
  users[key].password_hash = await hashPassword(newPassword);
  saveUsers(users as UsersJson);
  return true;
}
