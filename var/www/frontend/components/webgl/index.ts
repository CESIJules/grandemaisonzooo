"use client";

/**
 * Lazy exports for WebGL components — all disabled on SSR.
 * Usage: import { ParticleField, RadioVisualizer, VinylRecord } from "@/components/webgl"
 */
import dynamic from "next/dynamic";

export const ParticleField = dynamic(() => import("./ParticleField"), {
  ssr: false,
  loading: () => null,
});

export const RadioVisualizer = dynamic(() => import("./RadioVisualizer"), {
  ssr: false,
  loading: () => null,
});

export const VinylRecord = dynamic(() => import("./VinylRecord"), {
  ssr: false,
  loading: () => null,
});
