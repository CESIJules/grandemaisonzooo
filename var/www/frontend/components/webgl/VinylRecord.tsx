"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

interface VinylRecordProps {
  playing?: boolean;
  bpm?: number;  // beats per minute for rotation speed
  bass?: number; // 0-1 for reactive shimmer
  className?: string;
}

export default function VinylRecord({
  playing = false,
  bpm = 120,
  bass = 0,
  className,
}: VinylRecordProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const frameRef = useRef<number>(0);
  const propsRef = useRef({ playing, bpm, bass });

  propsRef.current = { playing, bpm, bass };

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // Scene
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      50,
      mount.clientWidth / mount.clientHeight,
      0.1,
      100
    );
    camera.position.z = 3.5;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setPixelRatio(1);  // capped — vinyl detail is geometric, retina ratio not worth the GPU cost
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Vinyl disc — dark base
    const discGeo = new THREE.CylinderGeometry(1, 1, 0.04, 80, 1);
    const discMat = new THREE.MeshStandardMaterial({
      color: 0x111111,
      roughness: 0.3,
      metalness: 0.6,
    });
    const disc = new THREE.Mesh(discGeo, discMat);
    disc.rotation.x = Math.PI / 2;
    scene.add(disc);

    // Groove rings (torus geometry)
    const grooveColors = [0x7c3aed, 0xec4899, 0x3b82f6, 0xa78bfa];
    const grooves: THREE.Mesh[] = [];
    for (let r = 0.3; r < 0.92; r += 0.055) {
      const geoGroove = new THREE.TorusGeometry(r, 0.003, 6, 80);
      const colorHex = grooveColors[Math.floor((r / 0.92) * grooveColors.length)];
      const matGroove = new THREE.MeshBasicMaterial({
        color: colorHex,
        transparent: true,
        opacity: 0.18,
      });
      const groove = new THREE.Mesh(geoGroove, matGroove);
      groove.rotation.x = Math.PI / 2;
      scene.add(groove);
      grooves.push(groove);
    }

    // Center label — violet circle
    const labelGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.05, 40);
    const labelMat = new THREE.MeshStandardMaterial({
      color: 0x7c3aed,
      roughness: 0.5,
    });
    const label = new THREE.Mesh(labelGeo, labelMat);
    label.rotation.x = Math.PI / 2;
    scene.add(label);

    // Center hole
    const holeMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const holeGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.06, 20);
    const hole = new THREE.Mesh(holeGeo, holeMat);
    hole.rotation.x = Math.PI / 2;
    scene.add(hole);

    // Lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambient);
    const pointLight = new THREE.PointLight(0xec4899, 1.2, 10);
    pointLight.position.set(2, 2, 3);
    scene.add(pointLight);
    const blueLight = new THREE.PointLight(0x3b82f6, 0.8, 10);
    blueLight.position.set(-2, -1, 2);
    scene.add(blueLight);

    // Group all parts for rotation
    const group = new THREE.Group();
    scene.remove(disc);
    scene.remove(label);
    scene.remove(hole);
    grooves.forEach((g) => scene.remove(g));
    group.add(disc, label, hole, ...grooves);
    scene.add(group);

    let currentAngle = 0;
    let prevBass = 0;
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
      const { playing: p, bpm: b, bass: bs } = propsRef.current;

      // Rotation: 33rpm vinyl = 33/60 = 0.55 rotations/sec
      // bpm affects shimmer speed
      const rpm = p ? 33 : 0;
      const deltaRad = (rpm / 60) * (Math.PI * 2) * (1 / 60); // assumes 60fps approx
      currentAngle += deltaRad;
      group.rotation.z = currentAngle;

      // Bass reactive tilt
      prevBass = prevBass * 0.85 + bs * 0.15;
      group.rotation.x = Math.PI / 2 + prevBass * 0.08;
      group.rotation.y = prevBass * 0.05;

      // Groove opacity shimmer on bass
      grooves.forEach((groove, i) => {
        const mat = groove.material as THREE.MeshBasicMaterial;
        mat.opacity = 0.18 + prevBass * 0.4 * ((i % 2 === 0) ? 1 : 0.5);
      });

      // Label color pulse
      (labelMat as THREE.MeshStandardMaterial).emissive.setHex(0x7c3aed);
      (labelMat as THREE.MeshStandardMaterial).emissiveIntensity = prevBass * 1.5;

      renderer.render(scene, camera);
    };
    animate();

    const observer = new ResizeObserver(() => {
      if (!mount) return;
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
      discGeo.dispose();
      discMat.dispose();
      labelGeo.dispose();
      labelMat.dispose();
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
