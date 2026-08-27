// Lightweight auth state hook. Caches the result so multiple tabs share one fetch.
import { useEffect, useState } from "react";

export interface AuthInfo {
  logged_in: boolean;
  user_id?: string;
  role?: "admin" | "artist";
  artist_id?: string | null;
}

let cached: AuthInfo | null = null;
let inFlight: Promise<AuthInfo> | null = null;

async function fetchAuth(): Promise<AuthInfo> {
  if (cached) return cached;
  if (inFlight) return inFlight;
  inFlight = fetch("/api/auth/check", { cache: "no-store" })
    .then((r) => r.json())
    .then((data: AuthInfo) => { cached = data; return data; })
    .catch(() => ({ logged_in: false }))
    .finally(() => { inFlight = null; });
  return inFlight;
}

export function useAuth(): { auth: AuthInfo | null; isAdmin: boolean; isArtist: boolean } {
  const [auth, setAuth] = useState<AuthInfo | null>(cached);
  useEffect(() => {
    if (cached) { setAuth(cached); return; }
    let alive = true;
    fetchAuth().then((a) => { if (alive) setAuth(a); });
    return () => { alive = false; };
  }, []);
  return {
    auth,
    isAdmin: auth?.role === "admin",
    isArtist: auth?.role === "artist",
  };
}
