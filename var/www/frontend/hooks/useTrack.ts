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

/**
 * useTrack — subscribes to /api/track/stream (SSE) for real-time track updates.
 * Falls back to polling /api/track/current if SSE is unavailable (e.g. iOS, proxies).
 */
export function useTrack(pollInterval = 10000) {
  const [track, setTrack] = useState<TrackData | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const fetchedAt = useRef<number>(0);
  const fetchedElapsed = useRef<number>(0);
  const esRef = useRef<EventSource | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const applyTrackData = useCallback((data: TrackData) => {
    setTrack(data);
    fetchedAt.current = Date.now();
    fetchedElapsed.current = data.elapsed ?? 0;
    setElapsed(data.elapsed ?? 0);
  }, []);

  const fetchTrack = useCallback(async () => {
    try {
      const res = await fetch("/api/track/current");
      if (!res.ok) return;
      const data = await res.json();
      if (data.filename) applyTrackData(data);
    } catch {
      // silent fail — radio may be offline
    }
  }, [applyTrackData]);

  useEffect(() => {
    // Try SSE first
    if (typeof EventSource !== "undefined") {
      const es = new EventSource("/api/track/stream");
      esRef.current = es;

      es.onmessage = (ev) => {
        try {
          const data: TrackData = JSON.parse(ev.data);
          if (data.filename) applyTrackData(data);
        } catch {
          // malformed — ignore
        }
      };

      es.onerror = () => {
        // SSE failed — fall back to polling
        es.close();
        esRef.current = null;
        fetchTrack();
        pollRef.current = setInterval(fetchTrack, pollInterval);
      };
    } else {
      // No EventSource support — use polling
      fetchTrack();
      pollRef.current = setInterval(fetchTrack, pollInterval);
    }

    return () => {
      esRef.current?.close();
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchTrack, applyTrackData, pollInterval]);

  // Smooth elapsed counter between server updates
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

