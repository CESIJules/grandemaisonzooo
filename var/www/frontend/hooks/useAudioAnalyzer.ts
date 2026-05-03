"use client";

import { useRef, useCallback } from "react";

export interface AudioAnalyzerData {
  bass: number;    // 0-1
  mid: number;     // 0-1
  high: number;    // 0-1
  rawData: Uint8Array;
}

let sharedAudioContext: AudioContext | null = null;
let sharedAnalyser: AnalyserNode | null = null;
let sharedSource: MediaElementAudioSourceNode | null = null;
let connectedElement: HTMLAudioElement | null = null;

function getSharedContext(): AudioContext {
  if (!sharedAudioContext || sharedAudioContext.state === "closed") {
    sharedAudioContext = new AudioContext();
  }
  return sharedAudioContext;
}

export function useAudioAnalyzer() {
  const frameRef = useRef<number>(0);

  const connect = useCallback((audioEl: HTMLAudioElement) => {
    if (connectedElement === audioEl && sharedAnalyser) return sharedAnalyser;
    try {
      const ctx = getSharedContext();
      if (ctx.state === "suspended") {
        ctx.resume().catch(() => {});
      }
      if (sharedSource && connectedElement !== audioEl) {
        sharedSource.disconnect();
        sharedSource = null;
      }
      if (!sharedAnalyser) {
        sharedAnalyser = ctx.createAnalyser();
        sharedAnalyser.fftSize = 256;
        sharedAnalyser.smoothingTimeConstant = 0.8;
        sharedAnalyser.connect(ctx.destination);
      }
      if (!sharedSource) {
        sharedSource = ctx.createMediaElementSource(audioEl);
        sharedSource.connect(sharedAnalyser);
        connectedElement = audioEl;
      }
    } catch {
      // AudioContext may not be available in SSR / restricted contexts
    }
    return sharedAnalyser;
  }, []);

  const read = useCallback((): AudioAnalyzerData => {
    const fallback: AudioAnalyzerData = {
      bass: 0,
      mid: 0,
      high: 0,
      rawData: new Uint8Array(128),
    };
    if (!sharedAnalyser) return fallback;

    const bufferLength = sharedAnalyser.frequencyBinCount; // 128
    const data = new Uint8Array(bufferLength);
    sharedAnalyser.getByteFrequencyData(data);

    const bassSlice = data.slice(0, 10);
    const midSlice = data.slice(10, 50);
    const highSlice = data.slice(50, 100);

    const avg = (arr: Uint8Array) =>
      arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length / 255 : 0;

    return {
      bass: avg(bassSlice),
      mid: avg(midSlice),
      high: avg(highSlice),
      rawData: data,
    };
  }, []);

  const stop = useCallback(() => {
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = 0;
    }
  }, []);

  return { connect, read, stop };
}
