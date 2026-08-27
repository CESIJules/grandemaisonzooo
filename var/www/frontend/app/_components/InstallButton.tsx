"use client";
import { useState, useEffect } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallButton() {
  const [mounted, setMounted] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    setMounted(true);
    setInstalled(window.matchMedia("(display-mode: standalone)").matches);

    const handler = (e: Event) => {
      e.preventDefault();
      setPrompt(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => { setInstalled(true); setPrompt(null); };

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!mounted || installed) return null;

  const handleClick = async () => {
    if (prompt) {
      await prompt.prompt();
      const { outcome } = await prompt.userChoice;
      if (outcome === "accepted") setInstalled(true);
      setPrompt(null);
    } else {
      setShowHint((h) => !h);
    }
  };

  return (
    <div style={{ position: "absolute", bottom: "2rem", left: "50%", transform: "translateX(-50%)", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem", zIndex: 10 }}>
      <button
        onClick={handleClick}
        aria-label="Ajouter à l'écran d'accueil"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          background: "none",
          border: "1px solid rgba(255,255,255,0.25)",
          color: "rgba(255,255,255,0.6)",
          fontFamily: "inherit",
          fontSize: "0.65rem",
          letterSpacing: "0.15em",
          textTransform: "uppercase",
          padding: "0.5rem 1.1rem",
          borderRadius: "2rem",
          cursor: "pointer",
          whiteSpace: "nowrap",
        }}
      >
        <i className="fas fa-plus-circle" />
        <span>Ajouter à l&rsquo;écran d&rsquo;accueil</span>
      </button>
      {showHint && !prompt && (
        <p style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.45)", textAlign: "center", maxWidth: "240px", lineHeight: 1.5, margin: 0 }}>
          Appuyez sur <i className="fas fa-arrow-up-from-bracket" /> puis &laquo;&nbsp;Sur l&rsquo;écran d&rsquo;accueil&nbsp;&raquo;
        </p>
      )}
    </div>
  );
}
