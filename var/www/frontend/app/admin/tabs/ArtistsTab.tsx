"use client";
import { useState } from "react";
import { useArtists } from "@/hooks/useArtists";
import type { ArtistProfile } from "@/types";
import styles from "./tab.module.css";
import { ArtistCardSkeleton } from "@/components/Skeleton";

const FIELD_LABELS: Record<string, string> = {
  name: "Nom de scène *",
  glitchName: "Nom stylisé",
  location: "Localisation",
  listenLink: "Lien écouter (Spotify…)",
  watchLink: "Lien regarder (YouTube…)",
  instagramLink: "Instagram",
  soundcloudUsername: "SoundCloud username",
  youtubeChannelId: "YouTube channel ID",
  deezerArtistId: "Deezer artist ID",
};

export default function ArtistsTab() {
  const { artists, loading, refresh } = useArtists();
  const [editing, setEditing] = useState<ArtistProfile | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  async function saveAll(updated: ArtistProfile[]) {
    setSaving(true);
    setSaveMsg(null);
    const res = await fetch("/api/artists/profiles", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updated),
    });
    const data = await res.json();
    setSaving(false);
    if (data.status === "success") { setEditing(null); refresh(); }
    else setSaveMsg(data.message);
  }

  function saveEdit(updated: ArtistProfile) {
    saveAll(artists.map((a) => (a.id === updated.id ? updated : a)));
  }

  if (loading) return (
    <div className={styles.tab}>
      <h2 className={styles.tabTitle}>Artistes</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "1rem" }}>
        {Array.from({ length: 4 }).map((_, i) => <ArtistCardSkeleton key={i} />)}
      </div>
    </div>
  );

  /* ─── EDIT VIEW ─────────────────────── */
  if (editing) {
    return (
      <div className={styles.tab}>
        <div className={styles.rowBetween}>
          <div className={styles.row}>
            <button className="btn btn-secondary" onClick={() => setEditing(null)}>
              <i className="fas fa-arrow-left" /> Retour
            </button>
            <h2 className={styles.tabTitle}>Modifier {editing.name}</h2>
          </div>
          <div className={styles.row}>
            {saving && <span style={{ opacity: 0.5, fontSize: "0.85rem" }}>Sauvegarde…</span>}
          </div>
        </div>

        <div className="card">
          <p style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-secondary)", margin: "0 0 1.25rem" }}>
            Informations générales
          </p>
          <ArtistForm
            profile={editing}
            onSave={saveEdit}
            saving={saving}
            onCancel={() => setEditing(null)}
            saveMsg={saveMsg}
          />
        </div>
      </div>
    );
  }

  /* ─── LIST VIEW ─────────────────────── */
  return (
    <div className={styles.tab}>
      <h2 className={styles.tabTitle}>Artistes</h2>

      <div className="card">
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Artiste</th>
                <th>Localisation</th>
                <th>ID</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {artists.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ textAlign: "center", opacity: 0.4, padding: "2rem" }}>Aucun artiste</td>
                </tr>
              )}
              {artists.map((a) => (
                <tr key={a.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{a.name}</div>
                    {a.glitchName && <div style={{ opacity: 0.4, fontSize: "0.78rem" }}>{a.glitchName}</div>}
                  </td>
                  <td className={styles.dim}>{a.location ?? "—"}</td>
                  <td className={styles.dim} style={{ fontSize: "0.78rem", fontFamily: "monospace" }}>{a.id}</td>
                  <td style={{ textAlign: "right" }}>
                    <button className={styles.btnSm} onClick={() => setEditing({ ...a })}>
                      <i className="fas fa-edit" /> Modifier
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

function ArtistForm({
  profile,
  onSave,
  saving,
  onCancel,
  saveMsg,
}: {
  profile: ArtistProfile;
  onSave: (p: ArtistProfile) => void;
  saving: boolean;
  onCancel: () => void;
  saveMsg: string | null;
}) {
  const [form, setForm] = useState({ ...profile });

  function set(key: keyof ArtistProfile, val: string) {
    setForm((prev) => ({ ...prev, [key]: val }));
  }

  return (
    <>
      <div className="form-grid">
        {(["name", "glitchName", "location", "listenLink", "watchLink", "instagramLink"] as const).map((k) => (
          <div key={k} className="form-group">
            <label>{FIELD_LABELS[k] ?? k}</label>
            <input
              value={(form[k] as string) ?? ""}
              onChange={(e) => set(k, e.target.value)}
              placeholder={k.includes("Link") ? "https://..." : ""}
            />
          </div>
        ))}
      </div>

      <div style={{ margin: "1.5rem 0 0.75rem", borderTop: "1px solid var(--surface-border)", paddingTop: "1.5rem" }}>
        <p style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-secondary)", margin: "0 0 1.25rem" }}>
          Sources auto — sync sorties
        </p>
        <div className="form-grid">
          {(["soundcloudUsername", "youtubeChannelId", "deezerArtistId"] as const).map((k) => (
            <div key={k} className="form-group">
              <label>{FIELD_LABELS[k]}</label>
              <input
                value={(form[k] as string | undefined) ?? ""}
                onChange={(e) => set(k, e.target.value)}
                placeholder={k === "soundcloudUsername" ? "monartiste" : k === "youtubeChannelId" ? "UCxxxxx" : "123456"}
              />
            </div>
          ))}
        </div>
      </div>

      {saveMsg && <p style={{ color: "#f87171", fontSize: "0.85rem", margin: "0.25rem 0 0" }}>{saveMsg}</p>}

      <div className="form-actions">
        <button className="btn btn-secondary" onClick={onCancel}>Annuler</button>
        <button className="btn btn-primary" onClick={() => onSave(form)} disabled={saving}>
          <i className="fas fa-save" /> {saving ? "Sauvegarde…" : "Sauvegarder"}
        </button>
      </div>
    </>
  );
}
