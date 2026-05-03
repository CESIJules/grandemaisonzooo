import { SessionOptions } from "iron-session";
import { SessionData } from "@/types";

export const sessionOptions: SessionOptions = {
  cookieName: "gmz_session",
  password: process.env.SESSION_SECRET ?? "CHANGE_ME_32_chars_minimum_secret",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 86400,
  },
};

export type { SessionData };
