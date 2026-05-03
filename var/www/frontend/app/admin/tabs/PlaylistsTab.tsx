"use client";
import { useEffect, useState } from "react";
import type { Playlist } from "@/types";
import styles from "./tab.module.css";
import { Skeleton } from "@/components/Skeleton";

const DAYS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

export default function PlaylistsTab() {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Editor state
  const [editing, setEditing] = useState<Playlist | null>(null);
  const [editSongs, setEditSongs] = useState<string[]>([]);
  const [library, setLibrary] = useState<string[]>([]);
  const [libSearch, setLibSearch] = useState("");
  const [saving, setSaving] = useState(false);

  // Create new playlist
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  // Schedule
  const [scheduling, setScheduling] = useState(false);
  const [schedForm, setSchedForm] = useState({ enabled: true, day: 1, hour: 8 });

  const load = async () => {
    setLoading(true);
    const res = await fetch("/api/playlists");
    const data = await res.json();
    const payload = data.data ?? data;
    if (payload.playlists) setPlaylists(payload.playlists);
    setActive(payload.active_playlist ?? null);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  async function openEditor(p: Playlist) {
    const res = await fetch("/api/music/files");
    const data = await res.json();
    setLibrary(data.files ?? []);
    setEditing(p);
    setEditSongs([...p.songs]);
    setSchedForm(p.schedule ? { enabled: p.schedule.enabled, day: p.schedule.day, hour: p.schedule.hour } : { enabled: true, day: 1, hour: 8 });
    setScheduling(false);
    setLibSearch("");
  }

  function addSong(filename: string) {
    if (!editSongs.includes(filename)) setEditSongs((s) => [...s, filename]);
  }

  function removeSong(filename: string) {
    setEditSongs((s) => s.filter((x) => x !== filename));
  }

  function moveSong(from: number, to: number) {
    const arr = [...editSongs];
    const [item] = arr.splice(from, 1);
    arr.splice(to, 0, item);
    setEditSongs(arr);
  }

  async function save() {
    if (!editing) return;
    setSaving(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body: Record<string, any> = { songs: editSongs };
    if (scheduling) body.schedule = schedForm;
    const res = await fetch(`/api/playlists/${encodeURIComponent(editing.name)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setSaving(false);
    if (data.status === "success") { setEditing(null); load(); }
    else alert(data.message);
  }

  async function create() {
    if (!newName.trim()) return;
    const res = await fetch("/api/playlists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim(), songs: [] }),
    });
    const data = await res.json();
    if (data.status === "success") { setNewName(""); setCreating(false); load(); }
    else alert(data.message);
  }

  async function del(name: string) {
    if (!confirm(`Supprimer "${name}" ?`)) return;
    await fetch(`/api/playlists/${encodeURIComponent(name)}`, { method: "DELETE" });
    if (editing?.name === name) setEditing(null);
    load();
  }

  async function setActivePl(name: string) {
    await fetch("/api/playlists/active", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    load();
  }

  const filteredLib = library.filter(
    (f) => f.toLowerCase().includes(libSearch.toLowerCase()) && !editSongs.includes(f)
  );

  if (loading) return (
    <div className={styles.tab}>
      <h2 className={styles.tabTitle}>Playlists</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "1.5rem" }}>
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} height="180px" borderRadius="16px" />)}
      </div>
    </div>
  );

  /* ─── EDITOR VIEW ─────────────────────── */
  if (editing) {
    return (
      <div className={styles.tab}>
        <div className="playlist-editor-panel">
          {/* Header */}
          <div className="editor-header">
            <div className="editor-title-section">
              <button className="btn btn-secondary" onClick={() => { setEditing(null); load(); }}>
                <i className="fas fa-arrow-left" /> Retour
              </button>
              <div>
                <div style={{ fontSize: "1.3rem", fontWeight: 700 }}>{editing.name}</div>
                <div className="editor-playlist-meta">
                  <span>{editSongs.length} titre{editSongs.length !== 1 ? "s" : ""}</span>
                  {active === editing.name && (
                    <span className="status-badge live">🔴 En direct</span>
                  )}
                </div>
              </div>
            </div>
            <div className="editor-actions">
              {active !== editing.name && (
                <button className="btn btn-secondary" onClick={() => setActivePl(editing.name)}>
                  <i className="fas fa-broadcast-tower" /> Activer
                </button>
              )}
              <button className="btn btn-danger-outline" onClick={() => del(editing.name)}>
                <i className="fas fa-trash" />
              </button>
              <button className="btn btn-success" onClick={save} disabled={saving}>
                <i className="fas fa-save" /> {saving ? "Enregistrement…" : "Enregistrer"}
              </button>
            </div>
          </div>

          {/* Two-column editor */}
          <div className="editor-content">
            {/* Left: Library */}
            <div className="editor-column">
              <div className="column-header">
                <h3><i className="fas fa-music" /> Bibliothèque</h3>
                <div className="library-filters">
                  <input
                    className="search-input"
                    placeholder="Rechercher…"
                    value={libSearch}
                    onChange={(e) => setLibSearch(e.target.value)}
                  />
                </div>
              </div>
              <div className="library-content">
                {filteredLib.length === 0 ? (
                  <div className="dropzone-hint" style={{ position: "static", transform: "none", paddingTop: "2rem" }}>
                    <i className="fas fa-music" />
                    <p>{library.length === 0 ? "Bibliothèque vide" : "Tous les titres sont déjà dans la playlist"}</p>
                  </div>
                ) : (
                  <ul className="songs-list">
                    {filteredLib.map((f) => (
                      <li key={f} className="song-item" onClick={() => addSong(f)}>
                        <i className="fas fa-grip-vertical drag-handle" />
                        <div className="song-info">
                          <div className="song-title">{f}</div>
                        </div>
                        <div className="song-actions" style={{ opacity: 1 }}>
                          <button className="btn-icon btn-add" title="Ajouter" onClick={(e) => { e.stopPropagation(); addSong(f); }}>
                            <i className="fas fa-plus" />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* Right: Playlist songs */}
            <div className="editor-column">
              <div className="column-header">
                <h3><i className="fas fa-list" /> Playlist</h3>
                <span className="song-count">{editSongs.length}</span>
              </div>
              <div className="songs-dropzone">
                {editSongs.length === 0 ? (
                  <div className="dropzone-hint">
                    <i className="fas fa-plus-circle" />
                    <p>Cliquez sur un titre pour l&apos;ajouter</p>
                  </div>
                ) : (
                  <ul className="songs-list">
                    {editSongs.map((f, i) => (
                      <li key={f} className="song-item">
                        <span style={{ opacity: 0.3, fontSize: "0.75rem", width: "1.5rem", textAlign: "center", flexShrink: 0 }}>{i + 1}</span>
                        <div className="song-info">
                          <div className="song-title">{f}</div>
                        </div>
                        <div className="song-actions" style={{ opacity: 1, display: "flex", gap: "4px" }}>
                          <button
                            className="btn-icon"
                            disabled={i === 0}
                            onClick={() => moveSong(i, i - 1)}
                            title="Monter"
                            style={{ opacity: i === 0 ? 0.25 : 1 }}
                          >
                            <i className="fas fa-chevron-up" />
                          </button>
                          <button
                            className="btn-icon"
                            disabled={i === editSongs.length - 1}
                            onClick={() => moveSong(i, i + 1)}
                            title="Descendre"
                            style={{ opacity: i === editSongs.length - 1 ? 0.25 : 1 }}
                          >
                            <i className="fas fa-chevron-down" />
                          </button>
                          <button className="btn-icon btn-remove" onClick={() => removeSong(f)} title="Retirer">
                            <i className="fas fa-times" />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

          {/* Schedule bar */}
          <div className={styles.scheduleBar}>
            <button className="btn-ghost btn" onClick={() => setScheduling(!scheduling)}>
              <i className="fas fa-clock" />
              {editing.schedule?.enabled
                ? ` Programmé: ${DAYS[editing.schedule.day]} ${String(editing.schedule.hour).padStart(2, "0")}h`
                : " Programmer"}
            </button>
            {scheduling && (
              <>
                <label className={styles.label} style={{ flexDirection: "row", alignItems: "center", gap: "0.4rem", margin: 0 }}>
                  <input type="checkbox" checked={schedForm.enabled} onChange={(e) => setSchedForm((f) => ({ ...f, enabled: e.target.checked }))} />
                  Activé
                </label>
                <select
                  className="search-input"
                  style={{ width: "auto" }}
                  value={schedForm.day}
                  onChange={(e) => setSchedForm((f) => ({ ...f, day: Number(e.target.value) }))}
                >
                  {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
                </select>
                <select
                  className="search-input"
                  style={{ width: "auto" }}
                  value={schedForm.hour}
                  onChange={(e) => setSchedForm((f) => ({ ...f, hour: Number(e.target.value) }))}
                >
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={i}>{String(i).padStart(2, "0")}h</option>
                  ))}
                </select>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* ─── GRID VIEW (default) ─────────────── */
  return (
    <div className={styles.tab}>
      <div className={styles.rowBetween}>
        <h2 className={styles.tabTitle}>Playlists</h2>
        <button className="btn btn-primary" onClick={() => setCreating(!creating)}>
          <i className="fas fa-plus" /> Nouvelle playlist
        </button>
      </div>

      {creating && (
        <div className="card" style={{ marginBottom: 0 }}>
          <p style={{ fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-secondary)", margin: "0 0 1rem" }}>
            Nouvelle playlist
          </p>
          <div className={styles.row}>
            <input
              className={styles.inputField}
              type="text"
              placeholder="Nom de la playlist"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && create()}
              autoFocus
            />
            <button className="btn btn-primary" onClick={create}>Créer</button>
            <button className="btn btn-secondary" onClick={() => setCreating(false)}>Annuler</button>
          </div>
        </div>
      )}

      <div className="playlists-grid">
        {playlists.map((p) => (
          <div
            key={p.name}
            className={`playlist-card${active === p.name ? " is-live" : ""}`}
            style={{ "--card-color": p.color ?? "#a855f7" } as React.CSSProperties}
            onClick={() => openEditor(p)}
          >
            <div className="playlist-card-icon">
              {p.icon ? <i className={`fas fa-${p.icon}`} /> : <i className="fas fa-music" />}
            </div>
            <div className="playlist-card-name">{p.name}</div>
            <div className="playlist-card-meta">
              <span><i className="fas fa-music" style={{ marginRight: 4 }} />{p.songs.length} titre{p.songs.length !== 1 ? "s" : ""}</span>
              {active === p.name && <span className="live-badge">En direct</span>}
              {p.schedule?.enabled && (
                <span><i className="fas fa-clock" style={{ marginRight: 4 }} />{DAYS[p.schedule.day]} {String(p.schedule.hour).padStart(2, "0")}h</span>
              )}
            </div>
            <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }} onClick={(e) => e.stopPropagation()}>
              {active !== p.name && (
                <button
                  className="btn btn-secondary"
                  style={{ fontSize: "0.75rem", padding: "6px 12px" }}
                  onClick={() => setActivePl(p.name)}
                >
                  <i className="fas fa-broadcast-tower" /> Activer
                </button>
              )}
              <button
                className="btn btn-danger"
                style={{ fontSize: "0.75rem", padding: "6px 10px" }}
                onClick={() => del(p.name)}
              >
                <i className="fas fa-trash" />
              </button>
            </div>
          </div>
        ))}

        {playlists.length === 0 && (
          <p style={{ opacity: 0.4, gridColumn: "1/-1", textAlign: "center", padding: "3rem", fontSize: "0.9rem" }}>
            Aucune playlist — créez-en une !
          </p>
        )}
      </div>
    </div>
  );
}
