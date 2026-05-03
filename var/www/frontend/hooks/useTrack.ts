"use client";
import { useState, useEffect, useRef, useCallback } from "react";

export interface TrackData {
  filename: string;
  artist: string;
  title: string;
  start_time: number;
  duration: number | null;
  elapsed: number;
  remaining: number | null;
  server_now: number;
}

export function useTrack(pollInterval = 10000) {
  const [track, setTrack] = useState<TrackData | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const fetchedAt = useRef<number>(0);
  const fetchedElapsed = useRef<number>(0);

  const fetchTrack = useCallback(async () => {
    try {
      const res = await fetch("/api/track/current");
      if (!res.ok) return;
      const data = await res.json();
      if (data.filename) {
        setTrack(data);
        fetchedAt.current = Date.now();
        fetchedElapsed.current = data.elapsed;
        setElapsed(data.elapsed);
      }
    } catch {
      // silent fail — radio may be offline
    }
  }, []);

  useEffect(() => {
    fetchTrack();
    const interval = setInterval(fetchTrack, pollInterval);
    return () => clearInterval(interval);
  }, [fetchTrack, pollInterval]);

  // Smooth elapsed counter between polls
  useEffect(() => {
    const ticker = setInterval(() => {
      const now = Date.now();
      const sinceLastFetch = (now - fetchedAt.current) / 1000;
      setElapsed(fetchedElapsed.current + sinceLastFetch);
    }, 500);
    return () => clearInterval(ticker);
  }, []);

  return { track, elapsed };
}
