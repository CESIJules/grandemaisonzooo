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

  if (loading) return (
    <div className={styles.tab}>
      <h2 className={styles.tabTitle}>Analytics</h2>
      <p className={styles.loading}>Chargement…</p>
    </div>
  );

  return (
    <div className={styles.tab}>
      <h2 className={styles.tabTitle}>Analytics</h2>

      <div className={styles.grid2}>
        <div className="card">
          <p style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-secondary)", margin: "0 0 1rem" }}>
            <i className="fas fa-trophy" style={{ marginRight: 6 }} />Top Artistes (30j)
          </p>
          <ol className={styles.rankList}>
            {topArtists.length === 0 && <li style={{ opacity: 0.4, fontSize: "0.85rem", padding: "0.5rem" }}>Pas de données</li>}
            {topArtists.map((a, i) => (
              <li key={i} className={styles.rankItem}>
                <span className={styles.rank}>{i + 1}</span>
                <span className={styles.rankName}>{a.artist}</span>
                <span className={styles.rankCount}>{a.count} plays</span>
              </li>
            ))}
          </ol>
        </div>

        <div className="card">
          <p style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-secondary)", margin: "0 0 1rem" }}>
            <i className="fas fa-fire" style={{ marginRight: 6 }} />Top Titres (30j)
          </p>
          <ol className={styles.rankList}>
            {topTracks.length === 0 && <li style={{ opacity: 0.4, fontSize: "0.85rem", padding: "0.5rem" }}>Pas de données</li>}
            {topTracks.map((t, i) => (
              <li key={i} className={styles.rankItem}>
                <span className={styles.rank}>{i + 1}</span>
                <span className={styles.rankName}>{t.title}{t.artist ? ` — ${t.artist}` : ""}</span>
                <span className={styles.rankCount}>{t.count} plays</span>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <div className="card">
        <p style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-secondary)", margin: "0 0 1rem" }}>
          <i className="fas fa-history" style={{ marginRight: 6 }} />Historique récent
        </p>
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
              {history.length === 0 && (
                <tr><td colSpan={4} style={{ textAlign: "center", opacity: 0.4, padding: "2rem" }}>Aucun historique</td></tr>
              )}
              {history.map((row) => (
                <tr key={row.id}>
                  <td className={styles.dim} style={{ fontSize: "0.8rem", whiteSpace: "nowrap" }}>{row.timestamp}</td>
                  <td style={{ fontWeight: 500 }}>{row.artist}</td>
                  <td>{row.title}</td>
                  <td>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", fontSize: "0.85rem" }}>
                      <i className="fas fa-headphones" style={{ opacity: 0.4, fontSize: "0.75rem" }} />
                      {row.listeners_start}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
