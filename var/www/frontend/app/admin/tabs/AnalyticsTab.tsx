"use client";
import { useEffect, useState } from "react";
import styles from "./tab.module.css";

interface TrackRow { id: number; timestamp: string; artist: string; title: string; listeners_start: number }
interface TopItem { artist?: string; title?: string; count: number }

export default function AnalyticsTab() {
  const [history, setHistory] = useState<TrackRow[]>([]);
  const [topArtists, setTopArtists] = useState<TopItem[]>([]);
  const [topTracks, setTopTracks] = useState<TopItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [h, a, t] = await Promise.all([
          fetch("/api/analytics?type=recent_plays&limit=20").then((r) => r.json()),
          fetch("/api/analytics?type=top_artists").then((r) => r.json()),
          fetch("/api/analytics?type=top_tracks").then((r) => r.json()),
        ]);
        if (h.status === "success") setHistory(h.data);
        if (a.status === "success") setTopArtists(a.data);
        if (t.status === "success") setTopTracks(t.data);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  if (loading) return <div className={styles.loading}>Chargement...</div>;

  return (
    <div className={styles.tab}>
      <h2 className={styles.tabTitle}>Analytics</h2>

      <div className={styles.grid2}>
        <section className={styles.card}>
          <h3 className={styles.cardTitle}>Top Artistes (30j)</h3>
          <ol className={styles.rankList}>
            {topArtists.map((a, i) => (
              <li key={i} className={styles.rankItem}>
                <span className={styles.rank}>{i + 1}</span>
                <span className={styles.rankName}>{a.artist}</span>
                <span className={styles.rankCount}>{a.count}</span>
              </li>
            ))}
          </ol>
        </section>

        <section className={styles.card}>
          <h3 className={styles.cardTitle}>Top Titres (30j)</h3>
          <ol className={styles.rankList}>
            {topTracks.map((t, i) => (
              <li key={i} className={styles.rankItem}>
                <span className={styles.rank}>{i + 1}</span>
                <span className={styles.rankName}>{t.title} — {t.artist}</span>
                <span className={styles.rankCount}>{t.count}</span>
              </li>
            ))}
          </ol>
        </section>
      </div>

      <section className={styles.card}>
        <h3 className={styles.cardTitle}>Historique récent</h3>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Horodatage</th>
                <th>Artiste</th>
                <th>Titre</th>
                <th>Auditeurs</th>
              </tr>
            </thead>
            <tbody>
              {history.map((row) => (
                <tr key={row.id}>
                  <td>{row.timestamp}</td>
                  <td>{row.artist}</td>
                  <td>{row.title}</td>
                  <td>{row.listeners_start}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
