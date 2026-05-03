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
        <div className="terminal-right">
          <pre id="asciiS"></pre>
        </div>
      </div>
    </div>
  );
}
