"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          background: "#050505",
          color: "#eee",
          fontFamily: "sans-serif",
          gap: "1.5rem",
          textAlign: "center",
          margin: 0,
          padding: "2rem",
          boxSizing: "border-box",
        }}
      >
        <h1 style={{ fontSize: "2rem", letterSpacing: "0.15em" }}>
          GRANDE MAISON — ERREUR CRITIQUE
        </h1>
        <p style={{ color: "#888", maxWidth: 480 }}>
          Le site a rencontré une erreur critique. Rechargez la page ou
          revenez dans quelques instants.
        </p>
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
      </body>
    </html>
  );
}
