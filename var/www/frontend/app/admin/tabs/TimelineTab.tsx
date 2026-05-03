"use client";
import { useState } from "react";
import { usePosts } from "@/hooks/usePosts";
import type { Post } from "@/types";
import styles from "./tab.module.css";

export default function TimelineTab() {
  const { posts, loading, refresh } = usePosts();
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ title: "", subtitle: "", date: "", artist: "", link: "", image: "" });

  function set(k: keyof typeof form, v: string) {
    setForm((prev) => ({ ...prev, [k]: v }));
  }

  async function addPost() {
    const res = await fetch("/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (data.status === "success") { setAdding(false); setForm({ title: "", subtitle: "", date: "", artist: "", link: "", image: "" }); refresh(); }
    else alert(data.message);
  }

  async function deletePost(id: number) {
    if (!confirm("Supprimer ce post ?")) return;
    await fetch(`/api/posts/${id}`, { method: "DELETE" });
    refresh();
  }

  if (loading) return <div className={styles.loading}>Chargement...</div>;

  return (
    <div className={styles.tab}>
      <h2 className={styles.tabTitle}>Timeline</h2>

      <section className={styles.card}>
        <div className={styles.rowBetween}>
          <h3 className={styles.cardTitle}>Posts ({posts.length})</h3>
          <button className={styles.btn} onClick={() => setAdding(!adding)}>
            <i className="fas fa-plus" /> Nouveau
          </button>
        </div>

        {adding && (
          <div className={styles.form} style={{ marginBottom: "1.5rem" }}>
            {(["title", "subtitle", "date", "artist", "link", "image"] as const).map((k) => (
              <label key={k} className={styles.label}>
                {k}{k === "title" || k === "date" || k === "artist" ? " *" : ""}
                <input
                  className={styles.inputField}
                  value={form[k]}
                  onChange={(e) => set(k, e.target.value)}
                  type={k === "date" ? "date" : "text"}
                />
              </label>
            ))}
            <div className={styles.row}>
              <button className={styles.btn} onClick={addPost}>Créer</button>
              <button className={styles.btnSm} onClick={() => setAdding(false)}>Annuler</button>
            </div>
          </div>
        )}

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead><tr><th>Titre</th><th>Artiste</th><th>Date</th><th></th></tr></thead>
            <tbody>
              {posts.map((p) => (
                <tr key={p.id}>
                  <td>{p.title}</td>
                  <td className={styles.dim}>{p.artist}</td>
                  <td className={styles.dim}>{p.date}</td>
                  <td>
                    <button className={styles.btnDanger} onClick={() => deletePost(p.id)}>
                      <i className="fas fa-trash" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
