"use client";
import { useTrack } from "@/hooks/useTrack";
import RadioPlayer from "@/components/RadioPlayer";
import styles from "./tab.module.css";

export default function RadioTab() {
  const { track } = useTrack(5000);

  async function skip() {
    await fetch("/api/track/skip", { method: "POST" });
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
            </>
          ) : (
            <p className={styles.dim}>Aucune piste en cours.</p>
          )}
        </section>
      </div>
    </div>
  );
}
