"use client";
import { useEffect, useRef } from "react";

interface VisualizerProps {
  audioRef: React.RefObject<HTMLAudioElement | null>;
  playing: boolean;
  width?: number;
  height?: number;
  barColor?: string;
  className?: string;
}

export default function AudioVisualizer({
  audioRef,
  playing,
  width = 300,
  height = 80,
  barColor = "var(--color-accent)",
  className,
}: VisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (!playing || !audioRef.current) return;

    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!ctxRef.current) {
      ctxRef.current = new AudioCtx();
    }
    const audioCtx = ctxRef.current;

    if (!sourceRef.current) {
      sourceRef.current = audioCtx.createMediaElementSource(audioRef.current);
    }

    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 64;
    analyserRef.current = analyser;
    sourceRef.current.connect(analyser);
    analyser.connect(audioCtx.destination);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const bufLen = analyser.frequencyBinCount;
    const dataArr = new Uint8Array(bufLen);

    const draw = () => {
      animFrameRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArr);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const barW = canvas.width / bufLen;
      for (let i = 0; i < bufLen; i++) {
        const barH = (dataArr[i] / 255) * canvas.height;
        ctx.fillStyle = barColor;
        ctx.fillRect(i * barW, canvas.height - barH, barW - 1, barH);
      }
    };
    draw();

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      analyser.disconnect();
    };
  }, [playing, audioRef, barColor]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className={className}
    />
  );
}
