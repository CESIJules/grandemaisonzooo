import AsciiObject from "@/components/canvasui/AsciiObject";

export default function TerminalOverlay() {
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
          <AsciiObject
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
        </div>
      </div>
    </div>
  );
}
