"use client";
import { useState, useEffect, useRef, useCallback } from "react";

export function useRadio(streamUrl: string) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolumeState] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const audio = new Audio();
    audio.preload = "none";
    audio.crossOrigin = "anonymous";
    audioRef.current = audio;

    audio.addEventListener("waiting", () => setLoading(true));
    audio.addEventListener("playing", () => { setLoading(false); setError(null); });
    audio.addEventListener("error", () => {
      setLoading(false);
      setPlaying(false);
      setError("Erreur de connexion au flux radio.");
    });

    return () => {
      audio.pause();
      audio.src = "";
      audioRef.current = null;
    };
  }, []);

  const play = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.src = streamUrl;
    audio.volume = volume;
    setLoading(true);
    audio.play().then(() => setPlaying(true)).catch(() => {
      setLoading(false);
      setError("Lecture impossible.");
    });
  }, [streamUrl, volume]);

  const pause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.src = "";
    setPlaying(false);
    setLoading(false);
  }, []);

  const toggle = useCallback(() => {
    if (playing) pause();
    else play();
  }, [playing, play, pause]);

  const setVolume = useCallback((v: number) => {
    const clamped = Math.max(0, Math.min(1, v));
    setVolumeState(clamped);
    if (audioRef.current) audioRef.current.volume = clamped;
  }, []);

  return { audioRef, playing, volume, loading, error, play, pause, toggle, setVolume };
}
