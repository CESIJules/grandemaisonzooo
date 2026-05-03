"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app/error]", error);
  }, [error]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        background: "#050505",
        color: "#eee",
        fontFamily: "'Space Grotesk', sans-serif",
        gap: "1.5rem",
        textAlign: "center",
        padding: "2rem",
      }}
    >
      <h1 style={{ fontSize: "2rem", letterSpacing: "0.15em" }}>
        ERREUR SYSTÈME
      </h1>
      <p style={{ color: "#888", maxWidth: 480 }}>
        Une erreur inattendue est survenue. L&apos;équipe technique en a été
        notifiée.
      </p>
      {error.digest && (
        <code
          style={{ fontSize: "0.75rem", color: "#555", fontFamily: "monospace" }}
        >
          ref: {error.digest}
        </code>
      )}
      <button
        onClick={reset}
        style={{
          marginTop: "1rem",
          padding: "0.75rem 2rem",
          background: "transparent",
          border: "1px solid #eee",
          color: "#eee",
          cursor: "pointer",
          letterSpacing: "0.1em",
          fontFamily: "inherit",
          fontSize: "0.9rem",
        }}
      >
        RÉESSAYER
      </button>
    </div>
  );
}
