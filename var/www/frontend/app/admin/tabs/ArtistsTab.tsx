"use client";
import { useState } from "react";
import { useArtists } from "@/hooks/useArtists";
import { useAuth } from "@/hooks/useAuth";
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
  soundcloudUserId: "SoundCloud User ID (numérique)",
  youtubeChannelId: "YouTube channel ID",
  deezerArtistId: "Deezer artist ID",
};

const EMPTY_PROFILE: ArtistProfile = {
  id: "",
  name: "",
  glitchName: "",
  location: "",
  listenLink: "",
  watchLink: "",
  instagramLink: "",
  soundcloudUserId: "",
  youtubeChannelId: "",
  deezerArtistId: "",
};

function slugify(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 32) || `artist_${Date.now()}`;
}

export default function ArtistsTab() {
  const { artists, loading, refresh } = useArtists();
  const { isAdmin, isArtist, auth } = useAuth();
  const [editing, setEditing] = useState<ArtistProfile | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  // Artists can only see and manage their own profile
  const visibleArtists = isArtist
    ? artists.filter((a) => a.id === auth?.artist_id)
    : artists;

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
    if (data.status === "success") { setEditing(null); setIsNew(false); refresh(); }
    else setSaveMsg(data.message);
  }

  function saveEdit(updated: ArtistProfile) {
    saveAll(artists.map((a) => (a.id === updated.id ? updated : a)));
  }

  function saveNew(profile: ArtistProfile) {
    const id = slugify(profile.name) || `artist_${Date.now()}`;
    const finalId = artists.some((a) => a.id === id) ? `${id}_${Date.now()}` : id;
    const newProfile: ArtistProfile = { ...profile, id: finalId };
    // Strip empty string optional fields
    (Object.keys(newProfile) as (keyof ArtistProfile)[]).forEach((k) => {
      if (k !== "id" && k !== "name" && newProfile[k] === "") delete newProfile[k];
    });
    saveAll([...artists, newProfile]);
  }

  function startNew() {
    setIsNew(true);
    setEditing({ ...EMPTY_PROFILE });
    setSaveMsg(null);
  }

  function cancelEdit() {
    setEditing(null);
    setIsNew(false);
    setSaveMsg(null);
  }

  if (loading) return (
    <div className={styles.tab}>
      <h2 className={styles.tabTitle}>Artistes</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "1rem" }}>
        {Array.from({ length: 4 }).map((_, i) => <ArtistCardSkeleton key={i} />)}
      </div>
    </div>
  );

  /* ─── EDIT / CREATE VIEW ────────────── */
  if (editing) {
    return (
      <div className={styles.tab}>
        <div className={styles.rowBetween}>
          <div className={styles.row}>
            <button className="btn btn-secondary" onClick={cancelEdit}>
              <i className="fas fa-arrow-left" /> Retour
            </button>
            <h2 className={styles.tabTitle}>
              {isNew ? "Nouvel artiste" : `Modifier ${editing.name}`}
            </h2>
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
            onSave={isNew ? saveNew : saveEdit}
            saving={saving}
            onCancel={cancelEdit}
            saveMsg={saveMsg}
            isNew={isNew}
          />
        </div>
      </div>
    );
  }

  /* ─── LIST VIEW ─────────────────────── */
  return (
    <div className={styles.tab}>
      <div className={styles.rowBetween}>
        <h2 className={styles.tabTitle}>{isArtist ? "Mon profil" : "Artistes"}</h2>
        {isAdmin && (
          <button className="btn btn-primary" onClick={startNew}>
            <i className="fas fa-plus" /> Nouvel artiste
          </button>
        )}
      </div>

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
              {visibleArtists.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ textAlign: "center", opacity: 0.4, padding: "2rem" }}>Aucun artiste</td>
                </tr>
              )}
              {visibleArtists.map((a) => (
                <tr key={a.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{a.name}</div>
                    {a.glitchName && <div style={{ opacity: 0.4, fontSize: "0.78rem" }}>{a.glitchName}</div>}
                  </td>
                  <td className={styles.dim}>{a.location ?? "—"}</td>
                  <td className={styles.dim} style={{ fontSize: "0.78rem", fontFamily: "monospace" }}>{a.id}</td>
                  <td style={{ textAlign: "right" }}>
                    <button className={styles.btnSm} onClick={() => { setIsNew(false); setSaveMsg(null); setEditing({ ...a }); }}>
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
  isNew = false,
}: {
  profile: ArtistProfile;
  onSave: (p: ArtistProfile) => void;
  saving: boolean;
  onCancel: () => void;
  saveMsg: string | null;
  isNew?: boolean;
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
          {(["soundcloudUserId", "youtubeChannelId", "deezerArtistId"] as const).map((k) => (
            <div key={k} className="form-group">
              <label>{FIELD_LABELS[k]}</label>
              <input
                value={(form[k] as string | undefined) ?? ""}
                onChange={(e) => set(k, e.target.value)}
                placeholder={k === "soundcloudUserId" ? "monartiste" : k === "youtubeChannelId" ? "UCxxxxx" : "123456"}
              />
            </div>
          ))}
        </div>
      </div>

      {saveMsg && <p style={{ color: "#f87171", fontSize: "0.85rem", margin: "0.25rem 0 0" }}>{saveMsg}</p>}

      <div className="form-actions">
        <button className="btn btn-secondary" onClick={onCancel}>Annuler</button>
        <button
          className="btn btn-primary"
          onClick={() => onSave(form)}
          disabled={saving || !form.name.trim()}
        >
          <i className={`fas fa-${isNew ? "plus" : "save"}`} />
          {" "}{saving ? "Sauvegarde…" : isNew ? "Créer l'artiste" : "Sauvegarder"}
        </button>
      </div>
    </>
  );
}
