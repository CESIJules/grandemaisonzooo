"use client";
import { useState } from "react";
import { useArtists } from "@/hooks/useArtists";
import type { ArtistProfile } from "@/types";
import styles from "./tab.module.css";

export default function ArtistsTab() {
  const { artists, loading, refresh } = useArtists();
  const [editing, setEditing] = useState<ArtistProfile | null>(null);
  const [saving, setSaving] = useState(false);

  async function saveAll(updated: ArtistProfile[]) {
    setSaving(true);
    const res = await fetch("/api/artists/profiles", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updated),
    });
    const data = await res.json();
    setSaving(false);
    if (data.status === "success") { setEditing(null); refresh(); }
    else alert(data.message);
  }

  function saveEdit(updated: ArtistProfile) {
    const next = artists.map((a) => (a.id === updated.id ? updated : a));
    saveAll(next);
  }

  if (loading) return <div className={styles.loading}>Chargement...</div>;

  if (editing) {
    return (
      <div className={styles.tab}>
        <button className={styles.btnSm} onClick={() => setEditing(null)}>
          <i className="fas fa-arrow-left" /> Retour
        </button>
        <h2 className={styles.tabTitle}>Modifier {editing.name}</h2>
        <section className={styles.card}>
          <ArtistForm
            profile={editing}
            onSave={saveEdit}
            saving={saving}
            onCancel={() => setEditing(null)}
          />
        </section>
      </div>
    );
  }

  return (
    <div className={styles.tab}>
      <h2 className={styles.tabTitle}>Artistes</h2>
      <section className={styles.card}>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead><tr><th>ID</th><th>Nom</th><th>Lieu</th><th></th></tr></thead>
            <tbody>
              {artists.map((a) => (
                <tr key={a.id}>
                  <td className={styles.dim}>{a.id}</td>
                  <td>{a.name}</td>
                  <td className={styles.dim}>{a.location ?? "—"}</td>
                  <td>
                    <button className={styles.btnSm} onClick={() => setEditing({ ...a })}>
                      <i className="fas fa-edit" /> Modifier
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

function ArtistForm({
  profile,
  onSave,
  saving,
  onCancel,
}: {
  profile: ArtistProfile;
  onSave: (p: ArtistProfile) => void;
  saving: boolean;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({ ...profile });

  function set(key: keyof ArtistProfile, val: string) {
    setForm((prev) => ({ ...prev, [key]: val }));
  }

  return (
    <div className={styles.form}>
      {(["name", "glitchName", "location", "listenLink", "watchLink", "instagramLink"] as const).map((k) => (
        <label key={k} className={styles.label}>
          {k}
          <input
            className={styles.inputField}
            value={(form[k] as string) ?? ""}
            onChange={(e) => set(k, e.target.value)}
          />
        </label>
      ))}
      <div className={styles.row}>
        <button className={styles.btn} onClick={() => onSave(form)} disabled={saving}>
          {saving ? "Sauvegarde..." : "Sauvegarder"}
        </button>
        <button className={styles.btnSm} onClick={onCancel}>Annuler</button>
      </div>
    </div>
  );
}
