"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

interface RadioVisualizerProps {
  rawData?: Uint8Array;
  playing?: boolean;
  className?: string;
}

const BAR_COUNT = 64;
const BAR_RADIUS = 1.4;

export default function RadioVisualizer({
  rawData,
  playing = false,
  className,
}: RadioVisualizerProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const barsRef = useRef<THREE.Mesh[]>([]);
  const frameRef = useRef<number>(0);
  const propsRef = useRef({ rawData, playing });

  propsRef.current = { rawData, playing };

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      60,
      mount.clientWidth / mount.clientHeight,
      0.1,
      100
    );
    camera.position.set(0, 0, 4.5);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true });
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setPixelRatio(1);  // capped — retina doubles GPU work for no visible gain on visualizer bars
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Create bars arranged in a circle
    const bars: THREE.Mesh[] = [];
    const baseColor = new THREE.Color(0x7c3aed);
    const peakColor = new THREE.Color(0xec4899);

    for (let i = 0; i < BAR_COUNT; i++) {
      const angle = (i / BAR_COUNT) * Math.PI * 2;
      const geometry = new THREE.BoxGeometry(0.05, 0.01, 0.05);
      const material = new THREE.MeshBasicMaterial({ color: baseColor.clone() });
      const mesh = new THREE.Mesh(geometry, material);

      mesh.position.x = Math.cos(angle) * BAR_RADIUS;
      mesh.position.y = Math.sin(angle) * BAR_RADIUS;
      mesh.rotation.z = angle + Math.PI / 2;

      scene.add(mesh);
      bars.push(mesh);
    }
    barsRef.current = bars;

    // Idle rotation group
    const group = new THREE.Group();
    bars.forEach((b) => {
      scene.remove(b);
      group.add(b);
    });
    scene.add(group);

    // Pre-compute bar positions — they are circular and never change, only scale.z changes
    const barAngles = bars.map((_, i) => (i / BAR_COUNT) * Math.PI * 2);
    const barPosX = barAngles.map((a) => Math.cos(a) * BAR_RADIUS);
    const barPosY = barAngles.map((a) => Math.sin(a) * BAR_RADIUS);

    let prevHeights = new Array(BAR_COUNT).fill(0);
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
      t += 0.005;

      const { rawData: data, playing: p } = propsRef.current;

      group.rotation.z = t * 0.3;

      bars.forEach((bar, i) => {
        const freqIndex = Math.floor((i / BAR_COUNT) * (data?.length ?? 128));
        const raw = data?.[freqIndex] ?? 0;
        const normalized = raw / 255;

        // Smoothing
        const target = p ? normalized : Math.sin(t * 2 + i * 0.3) * 0.04 + 0.02;
        prevHeights[i] = prevHeights[i] * 0.7 + target * 0.3;
        const h = Math.max(prevHeights[i], 0.01);

        // Use pre-computed positions (no Math.cos/sin per frame)
        bar.scale.z = h * 20 + 1;
        bar.position.x = barPosX[i];
        bar.position.y = barPosY[i];

        // Color interpolation violet → rose based on amplitude
        const mat = bar.material as THREE.MeshBasicMaterial;
        mat.color.lerpColors(baseColor, peakColor, Math.min(h * 2, 1));
      });

      renderer.render(scene, camera);
    };
    animate();

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
      bars.forEach((b) => {
        b.geometry.dispose();
        (b.material as THREE.Material).dispose();
      });
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className={className}
      style={{ width: "100%", height: "100%" }}
      aria-hidden="true"
    />
  );
}
