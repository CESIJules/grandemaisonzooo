import { SessionOptions } from "iron-session";
import { SessionData } from "@/types";

const secret = process.env.SESSION_SECRET;
if (!secret || secret === "CHANGE_ME_32_chars_minimum_secret") {
  throw new Error(
    "[GMZ] SESSION_SECRET est manquant ou utilise la valeur par défaut. " +
      "Définissez une clé aléatoire d'au moins 32 caractères dans .env.local."
  );
}

export const sessionOptions: SessionOptions = {
  cookieName: "gmz_session",
  password: secret,
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 86400,
  },
};

export type { SessionData };
