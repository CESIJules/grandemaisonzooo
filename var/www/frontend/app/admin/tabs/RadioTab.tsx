"use client";
import { useState, useEffect, useCallback } from "react";
import { useTrack } from "@/hooks/useTrack";
import RadioPlayer from "@/components/RadioPlayer";
import styles from "./tab.module.css";

interface QueueTrack {
  id: string;
  filename: string;
  artist: string;
  title: string;
}

export default function RadioTab() {
  const { track } = useTrack(5000);
  const [queue, setQueue] = useState<QueueTrack[]>([]);
  const [queueLoading, setQueueLoading] = useState(false);
  const [skipFeedback, setSkipFeedback] = useState("");

  const loadQueue = useCallback(async () => {
    setQueueLoading(true);
    try {
      const res = await fetch("/api/track/queue");
      if (res.ok) {
        const data = await res.json();
        setQueue(data.data ?? []);
      }
    } catch {
      // silent
    } finally {
      setQueueLoading(false);
    }
  }, []);

  useEffect(() => {
    loadQueue();
    const interval = setInterval(loadQueue, 15000);
    return () => clearInterval(interval);
  }, [loadQueue]);

  async function skip() {
    setSkipFeedback("");
    const res = await fetch("/api/track/skip", { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setSkipFeedback(data.message ?? (res.ok ? "Skip envoyé." : "Erreur."));
    setTimeout(() => setSkipFeedback(""), 3000);
    setTimeout(loadQueue, 1500);
  }

  return (
    <div className={styles.tab}>
      <h2 className={styles.tabTitle}>Radio</h2>
      <div className={styles.grid2}>
        <section className={styles.card}>
          <h3 className={styles.cardTitle}>Lecteur</h3>
          <RadioPlayer />
        </section>
        <section className={styles.card}>
          <h3 className={styles.cardTitle}>En cours</h3>
          {track ? (
            <>
              <p><strong>{track.title}</strong></p>
              <p className={styles.dim}>{track.artist}</p>
              <p className={styles.dim}>Fichier: {track.filename}</p>
              <button className={styles.btnDanger} onClick={skip}>
                <i className="fas fa-forward" /> Skip
              </button>
              {skipFeedback && <p className={styles.dim} style={{ marginTop: "0.5rem" }}>{skipFeedback}</p>}
            </>
          ) : (
            <p className={styles.dim}>Aucune piste en cours.</p>
          )}
        </section>
      </div>

      <section className={styles.card} style={{ marginTop: "1.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <h3 className={styles.cardTitle} style={{ margin: 0 }}>File d&apos;attente Liquidsoap</h3>
            <button className={styles.btnSm} onClick={loadQueue} disabled={queueLoading}>
            <i className="fas fa-sync" /> {queueLoading ? "Chargement…" : "Actualiser"}
          </button>
        </div>
        {queue.length === 0 ? (
          <p className={styles.dim} style={{ marginTop: "1rem" }}>
            {queueLoading ? "Chargement…" : "Queue vide ou indisponible."}
          </p>
        ) : (
          <table className={styles.table} style={{ marginTop: "1rem" }}>
            <thead>
              <tr>
                <th>#</th>
                <th>Artiste</th>
                <th>Titre</th>
              </tr>
            </thead>
            <tbody>
              {queue.map((t, i) => (
                <tr key={t.id}>
                  <td className={styles.dim}>{i + 1}</td>
                  <td>{t.artist || <span className={styles.dim}>—</span>}</td>
                  <td>{t.title || t.filename}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
