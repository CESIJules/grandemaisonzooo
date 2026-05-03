"use client";
import { useState, useEffect, useCallback } from "react";
import type { ArtistProfile } from "@/types";

export function useArtists() {
  const [artists, setArtists] = useState<ArtistProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfiles = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/artists/profiles");
      const data = await res.json();
      // API returns either a raw array or { status, data }
      if (Array.isArray(data)) setArtists(data);
      else if (data.status === "success") setArtists(data.data);
      else setError(data.message);
    } catch {
      setError("Erreur de chargement des artistes.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  return { artists, loading, error, refresh: fetchProfiles };
}
