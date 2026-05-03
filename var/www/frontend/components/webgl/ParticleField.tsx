"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

interface ParticleFieldProps {
  bass?: number;
  mid?: number;
  high?: number;
  playing?: boolean;
  className?: string;
}

const PARTICLE_COUNT = 400;  // 800 → 400, halved for perf

// Palette: violet #7c3aed, rose #ec4899, bleu #3b82f6
const PALETTE = [0x7c3aed, 0xec4899, 0x3b82f6, 0xa78bfa, 0xf472b6];

export default function ParticleField({
  bass = 0,
  mid = 0,
  high = 0,
  playing = false,
  className,
}: ParticleFieldProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const particlesRef = useRef<THREE.Points | null>(null);
  const frameRef = useRef<number>(0);
  const propsRef = useRef({ bass, mid, high, playing });

  // Keep props accessible in animation loop without re-creating it
  propsRef.current = { bass, mid, high, playing };

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(
      75,
      mount.clientWidth / mount.clientHeight,
      0.1,
      1000
    );
    camera.position.z = 5;
    cameraRef.current = camera;

    // Renderer — antialias off for particles (no difference visually), pixelRatio capped at 1
    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true });
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setPixelRatio(1);  // capped — retina doubles GPU work for no visible gain on particles
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Particles
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const colors = new Float32Array(PARTICLE_COUNT * 3);
    const sizes = new Float32Array(PARTICLE_COUNT);

    const colorObj = new THREE.Color();
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 12;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 12;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 12;

      colorObj.setHex(PALETTE[Math.floor(Math.random() * PALETTE.length)]);
      colors[i * 3] = colorObj.r;
      colors[i * 3 + 1] = colorObj.g;
      colors[i * 3 + 2] = colorObj.b;

      sizes[i] = Math.random() * 2 + 0.5;
    }

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute("size", new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
      size: 0.05,
      vertexColors: true,
      transparent: true,
      opacity: 0.7,
      sizeAttenuation: true,
    });

    const points = new THREE.Points(geometry, material);
    scene.add(points);
    particlesRef.current = points;

    // Animation loop — throttled to 30fps, paused when off-screen
    let t = 0;
    let isVisible = true;
    let lastFrameTime = 0;
    const FRAME_MS = 1000 / 30;

    const visObserver = new IntersectionObserver(
      (entries) => { isVisible = entries[0].isIntersecting; },
      { threshold: 0 }
    );
    visObserver.observe(mount);

    const animate = (now = 0) => {
      frameRef.current = requestAnimationFrame(animate);
      if (!isVisible) return;
      if (now - lastFrameTime < FRAME_MS) return;
      lastFrameTime = now;
      t += 0.001;

      const { bass: b, mid: m, high: h, playing: p } = propsRef.current;
      const energyScale = p ? 1 + b * 1.5 + m * 0.5 : 0.2;

      if (particlesRef.current) {
        particlesRef.current.rotation.x = t * 0.3 + b * 0.05;
        particlesRef.current.rotation.y = t * 0.5 + m * 0.03;

        // Pulse scale on beat
        const targetScale = 1 + b * 0.3 + h * 0.1;
        particlesRef.current.scale.lerp(
          new THREE.Vector3(targetScale, targetScale, targetScale),
          0.05
        );

        if (material) {
          material.opacity = 0.4 + energyScale * 0.25;
        }
      }

      renderer.render(scene, camera);
    };
    animate();

    // Resize observer
    const observer = new ResizeObserver(() => {
      if (!mount || !renderer || !camera) return;
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    });
    observer.observe(mount);

    return () => {
      cancelAnimationFrame(frameRef.current);
      observer.disconnect();
      visObserver.disconnect();
      renderer.dispose();
      geometry.dispose();
      material.dispose();
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className={className}
      style={{ width: "100%", height: "100%", position: "absolute", inset: 0 }}
      aria-hidden="true"
    />
  );
}
