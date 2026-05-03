"use client";
import { useState } from "react";
import { usePosts } from "@/hooks/usePosts";
import type { Post } from "@/types";
import styles from "./tab.module.css";
import { TimelineItemSkeleton } from "@/components/Skeleton";

export default function TimelineTab() {
  const { posts, loading, refresh } = usePosts();
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ title: "", subtitle: "", date: "", artist: "", link: "", image: "" });
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  function set(k: keyof typeof form, v: string) {
    setForm((prev) => ({ ...prev, [k]: v }));
  }

  async function addPost() {
    setMsg(null);
    const res = await fetch("/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (data.status === "success") {
      setAdding(false);
      setForm({ title: "", subtitle: "", date: "", artist: "", link: "", image: "" });
      refresh();
    } else {
      setMsg(data.message);
    }
  }

  async function deletePost(id: number) {
    if (!confirm("Supprimer ce post ?")) return;
    await fetch(`/api/posts/${id}`, { method: "DELETE" });
    refresh();
  }

  async function syncReleases() {
    setSyncing(true);
    setSyncMsg(null);
    try {
      const res = await fetch("/api/releases/sync", { method: "POST" });
      const data = await res.json();
      if (data.status === "success") {
        setSyncMsg(`✓ ${data.added} ajouté(s), ${data.skipped} déjà présent(s).`);
        if (data.added > 0) refresh();
      } else {
        setSyncMsg(`Erreur : ${data.message}`);
      }
    } catch {
      setSyncMsg("Erreur de connexion.");
    } finally {
      setSyncing(false);
    }
  }

  if (loading) return (
    <div className={styles.tab}>
      <div className={styles.rowBetween}>
        <h2 className={styles.tabTitle}>Timeline</h2>
      </div>
      <div className="card">
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {Array.from({ length: 5 }).map((_, i) => <TimelineItemSkeleton key={i} />)}
        </div>
      </div>
    </div>
  );

  return (
    <div className={styles.tab}>
      {/* Header */}
      <div className={styles.rowBetween}>
        <h2 className={styles.tabTitle}>Timeline</h2>
        <div className={styles.row}>
          <button className="btn btn-secondary" onClick={syncReleases} disabled={syncing} style={{ fontSize: "0.85rem" }}>
            <i className={`fas fa-sync${syncing ? " fa-spin" : ""}`} /> {syncing ? "Sync…" : "Synchroniser sorties"}
          </button>
          <button className="btn btn-primary" onClick={() => setAdding(!adding)}>
            <i className="fas fa-plus" /> Nouveau post
          </button>
        </div>
      </div>

      {syncMsg && (
        <div className="card" style={{ padding: "0.75rem 1.25rem", background: "rgba(34,197,94,0.07)", borderColor: "rgba(34,197,94,0.2)" }}>
          <p style={{ margin: 0, fontSize: "0.85rem", color: "#4ade80" }}>{syncMsg}</p>
        </div>
      )}

      {/* Add form */}
      {adding && (
        <div className="card">
          <h3 style={{ fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-secondary)", margin: "0 0 1.25rem" }}>
            Nouveau post
          </h3>
          <div className="form-grid">
            {(["title", "artist", "date", "link", "image"] as const).map((k) => (
              <div key={k} className="form-group">
                <label>{k === "title" ? "Titre *" : k === "artist" ? "Artiste *" : k === "date" ? "Date *" : k === "link" ? "Lien" : "URL image"}</label>
                <input
                  value={form[k]}
                  onChange={(e) => set(k, e.target.value)}
                  type={k === "date" ? "date" : "text"}
                  placeholder={k === "link" ? "https://..." : k === "image" ? "https://..." : ""}
                />
              </div>
            ))}
          </div>
          {msg && <p style={{ color: "#f87171", fontSize: "0.85rem", margin: "0.5rem 0 0" }}>{msg}</p>}
          <div className="form-actions">
            <button className="btn btn-secondary" onClick={() => setAdding(false)}>Annuler</button>
            <button className="btn btn-primary" onClick={addPost}>
              <i className="fas fa-check" /> Publier
            </button>
          </div>
        </div>
      )}

      {/* Posts list */}
      <div className="card">
        <div className={styles.rowBetween} style={{ marginBottom: "1rem" }}>
          <h3 style={{ margin: 0, fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-secondary)" }}>
            Posts publiés ({posts.length})
          </h3>
        </div>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Titre</th>
                <th>Artiste</th>
                <th>Date</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {posts.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ textAlign: "center", opacity: 0.4, padding: "2rem" }}>Aucun post</td>
                </tr>
              )}
              {posts.map((p: Post) => (
                <tr key={p.id}>
                  <td style={{ fontWeight: 500 }}>{p.title}</td>
                  <td className={styles.dim}>{p.artist}</td>
                  <td className={styles.dim}>{p.date}</td>
                  <td style={{ textAlign: "right" }}>
                    <button className={styles.btnDanger} onClick={() => deletePost(p.id)}>
                      <i className="fas fa-trash" />
                    </button>
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
