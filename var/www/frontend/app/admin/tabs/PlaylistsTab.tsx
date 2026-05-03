"use client";
import { useEffect, useState } from "react";
import type { Playlist } from "@/types";
import styles from "./tab.module.css";

export default function PlaylistsTab() {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const res = await fetch("/api/playlists");
    const data = await res.json();
    if (data.playlists) setPlaylists(data.playlists);
    setActive(data.active_playlist ?? null);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  async function create() {
    if (!newName.trim()) return;
    const res = await fetch("/api/playlists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim(), songs: [] }),
    });
    const data = await res.json();
    if (data.status === "success") { setNewName(""); load(); }
    else alert(data.message);
  }

  async function del(name: string) {
    if (!confirm(`Supprimer "${name}" ?`)) return;
    await fetch(`/api/playlists/${encodeURIComponent(name)}`, { method: "DELETE" });
    load();
  }

  async function setActivePl(name: string | null) {
    await fetch("/api/playlists/active", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    load();
  }

  if (loading) return <div className={styles.loading}>Chargement...</div>;

  return (
    <div className={styles.tab}>
      <h2 className={styles.tabTitle}>Playlists</h2>

      <section className={styles.card}>
        <h3 className={styles.cardTitle}>Créer une playlist</h3>
        <div className={styles.row}>
          <input
            type="text"
            placeholder="Nom de la playlist"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className={styles.inputField}
            onKeyDown={(e) => e.key === "Enter" && create()}
          />
          <button className={styles.btn} onClick={create}>
            <i className="fas fa-plus" /> Créer
          </button>
        </div>
      </section>

      <section className={styles.card}>
        <h3 className={styles.cardTitle}>Playlists ({playlists.length})</h3>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Nom</th>
                <th>Titres</th>
                <th>Statut</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {playlists.map((p) => (
                <tr key={p.name}>
                  <td>{p.name}</td>
                  <td>{p.songs.length}</td>
                  <td>
                    {active === p.name ? (
                      <span className={styles.badge}>Active</span>
                    ) : (
                      <button className={styles.btnSm} onClick={() => setActivePl(p.name)}>
                        Activer
                      </button>
                    )}
                  </td>
                  <td>
                    <button className={styles.btnDanger} onClick={() => del(p.name)}>
                      <i className="fas fa-trash" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {active && (
          <button className={styles.btnSm} onClick={() => setActivePl(null)} style={{ marginTop: "1rem" }}>
            Désactiver playlist active
          </button>
        )}
      </section>
    </div>
  );
}
