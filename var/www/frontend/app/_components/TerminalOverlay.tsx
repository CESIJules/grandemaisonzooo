"use client";

import { useEffect, useState } from "react";
import AsciiObject from "@/components/canvasui/AsciiObject";
import GlassObject from "@/components/canvasui/GlassObject";

export default function TerminalOverlay() {
  const [renderMode, setRenderMode] = useState<"ascii" | "glass">("ascii");

  useEffect(() => {
    const handleModeChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ mode: "ascii" | "glass" }>;
      if (customEvent.detail?.mode) {
        setRenderMode(customEvent.detail.mode);
      }
    };
    window.addEventListener("terminal-3d-mode", handleModeChange);
    return () => {
      window.removeEventListener("terminal-3d-mode", handleModeChange);
    };
  }, []);

  return (
    <div id="terminalOverlay" className="hidden">
      <div id="terminalLoading" className="hidden">
        <span className="dot">.</span>
        <span className="dot">.</span>
        <span className="dot">.</span>
      </div>
      <div className="terminal-content hidden" id="terminalContent">
        <div className="terminal-left" id="terminalLeft">
          <div id="terminalHistory"></div>
          <div className="terminal-input-line" id="inputLine">
            <span className="prompt">&gt;</span>
            <div className="input-wrapper">
              <input
                type="text"
                id="terminalInput"
                autoComplete="off"
                spellCheck={false}
              />
              <div id="ghostText"></div>
            </div>
          </div>
        </div>
        <div className="terminal-right" id="terminalRight" style={{ position: "relative", width: "50%", height: "100%" }}>
          {renderMode === "ascii" ? (
            <AsciiObject
              key="ascii"
              src="/uploads/obj/base_basic_pbr.glb"
              diffuseMap="/uploads/obj/texture_diffuse.png"
              normalMap="/uploads/obj/texture_normal.png"
              roughnessMap="/uploads/obj/texture_roughness.png"
              metalnessMap="/uploads/obj/texture_metallic.png"
              style={{ width: "100%", height: "100%" }}
              cellSize={8}
              cellAspect={0.6}
              contrast={1.6}
              edgeContrast={3.2}
              exposure={1.1}
              environmentIntensity={1.2}
              scale={3.2}
              floatIntensity={1.2}
              rotationIntensity={0.8}
              floatSpeed={1.5}
              orbit={true}
              autoRotate={true}
              autoRotateSpeed={1.5}
              colored={true}
              color="#a78bfa"
              highlight="#7c3aed"
            />
          ) : (
            <GlassObject
              key="glass"
              src="/uploads/obj/base_basic_pbr.glb"
              style={{ width: "100%", height: "100%" }}
              ior={1.75}
              thickness={4}
              roughness={0.25}
              dispersion={1.5}
              clearcoat={0.5}
              tintDensity={2}
              depth={0.1}
              bevel={1}
              environmentIntensity={1}
              scale={3}
              xOffset={0}
              yOffset={0}
              floatIntensity={1}
              rotationIntensity={1}
              floatSpeed={2}
              fov={55}
              cameraDistance={4}
              autoRotate={true}
              autoRotateSpeed={1.5}
              zoom={false}
              tint=""
              highlight="#066aff"
              backgroundImage="https://images.unsplash.com/photo-1782977389500-dd7adad33ebe?q=80&w=2032&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
            />
          )}
        </div>
      </div>
    </div>
  );
}
