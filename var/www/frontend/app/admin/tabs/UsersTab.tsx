"use client";
import { useState, useEffect, useCallback } from "react";
import type { ArtistProfile } from "@/types";
import tab from "./tab.module.css";

interface UserRow {
  username: string;
  role: "admin" | "artist";
  artist_id: string | null;
}

interface NewUserForm {
  username: string;
  password: string;
  role: "admin" | "artist";
  artist_id: string;
}

const EMPTY_NEW: NewUserForm = {
  username: "",
  password: "",
  role: "artist",
  artist_id: "",
};

export default function UsersTab() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [artists, setArtists] = useState<ArtistProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<NewUserForm>(EMPTY_NEW);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Per-row edit state
  const [editingPassword, setEditingPassword] = useState<Record<string, string>>({});
  const [busyRow, setBusyRow] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [usersRes, artistsRaw] = await Promise.all([
        fetch("/api/admin/users", { cache: "no-store" }).then((r) => r.json()),
        fetch("/api/artists/profiles", { cache: "no-store" }).then((r) => r.json()).catch(() => []),
      ]);
      if (usersRes.status === "success") setUsers(usersRes.data ?? []);
      if (Array.isArray(artistsRaw)) setArtists(artistsRaw);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const payload = {
        username: form.username.trim(),
        password: form.password,
        role: form.role,
        artist_id: form.role === "artist" ? (form.artist_id || null) : null,
      };
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.status !== "success") {
        setError(data.message ?? "Erreur");
      } else {
        setForm(EMPTY_NEW);
        await load();
      }
    } catch {
      setError("Erreur de connexion.");
    } finally {
      setSaving(false);
    }
  }

  async function resetPassword(u: UserRow) {
    const pwd = editingPassword[u.username];
    if (!pwd || pwd.length < 6) {
      alert("Mot de passe trop court (min 6 caractères).");
      return;
    }
    setBusyRow(u.username);
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(u.username)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pwd }),
      });
      const data = await res.json();
      if (data.status !== "success") {
        alert(data.message ?? "Erreur");
      } else {
        setEditingPassword((prev) => {
          const next = { ...prev };
          delete next[u.username];
          return next;
        });
      }
    } finally {
      setBusyRow(null);
    }
  }

  async function changeArtistId(u: UserRow, artist_id: string) {
    setBusyRow(u.username);
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(u.username)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ artist_id }),
      });
      const data = await res.json();
      if (data.status !== "success") {
        alert(data.message ?? "Erreur");
      } else {
        await load();
      }
    } finally {
      setBusyRow(null);
    }
  }

  async function changeRole(u: UserRow, role: "admin" | "artist") {
    if (!confirm(`Changer le rôle de "${u.username}" en ${role} ?`)) return;
    setBusyRow(u.username);
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(u.username)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const data = await res.json();
      if (data.status !== "success") {
        alert(data.message ?? "Erreur");
      } else {
        await load();
      }
    } finally {
      setBusyRow(null);
    }
  }

  async function remove(u: UserRow) {
    if (!confirm(`Supprimer le compte "${u.username}" ? Cette action est irréversible.`)) return;
    setBusyRow(u.username);
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(u.username)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.status !== "success") {
        alert(data.message ?? "Erreur");
      } else {
        await load();
      }
    } finally {
      setBusyRow(null);
    }
  }

  return (
    <div className={tab.tab}>
      <div className={tab.rowBetween}>
        <h2 className={tab.tabTitle}>Utilisateurs</h2>
        <span style={{ fontSize: "0.8rem", opacity: 0.5 }}>
          Gestion des comptes admin / artiste.
        </span>
      </div>

      {/* ── Create ─────────────────────────────────────────────── */}
      <form
        onSubmit={createUser}
        className={tab.form}
        style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "14px",
          padding: "1.25rem",
        }}
      >
        <strong style={{ fontFamily: "'Syne', sans-serif", fontSize: "1.1rem" }}>
          Nouveau compte
        </strong>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem" }}>
          <label className={tab.label}>
            Identifiant
            <input
              className={tab.inputField}
              type="text"
              required
              minLength={2}
              maxLength={40}
              pattern="[a-zA-Z0-9_.\-]+"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              placeholder="nelsonnorth"
              style={{ fontFamily: "monospace" }}
            />
          </label>

          <label className={tab.label}>
            Mot de passe
            <input
              className={tab.inputField}
              type="password"
              required
              minLength={6}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="••••••••"
            />
          </label>

          <label className={tab.label}>
            Rôle
            <select
              className={tab.inputField}
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value as "admin" | "artist", artist_id: "" })}
            >
              <option value="artist">Artiste</option>
              <option value="admin">Admin</option>
            </select>
          </label>

          {form.role === "artist" && (
            <label className={tab.label}>
              Artiste lié
              <select
                className={tab.inputField}
                required
                value={form.artist_id}
                onChange={(e) => setForm({ ...form, artist_id: e.target.value })}
              >
                <option value="">— sélectionner —</option>
                {artists.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </label>
          )}
        </div>

        {error && (
          <div style={{ color: "#ff6b6b", fontSize: "0.85rem" }}>{error}</div>
        )}

        <div className={tab.row}>
          <button className="btn btn-primary" type="submit" disabled={saving}>
            <i className="fas fa-user-plus" /> {saving ? "Création…" : "Créer le compte"}
          </button>
        </div>
      </form>

      {/* ── List ───────────────────────────────────────────────── */}
      {loading ? (
        <p style={{ opacity: 0.6 }}>
          <i className="fas fa-spinner fa-spin" /> Chargement…
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {users.map((u) => {
            const artistName = u.artist_id
              ? artists.find((a) => a.id === u.artist_id)?.name ?? u.artist_id
              : null;
            const isBusy = busyRow === u.username;
            const newPwd = editingPassword[u.username] ?? "";
            return (
              <div
                key={u.username}
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "12px",
                  padding: "1rem 1.25rem",
                  display: "grid",
                  gridTemplateColumns: "minmax(160px, 1fr) minmax(160px, 1fr) minmax(220px, 2fr) auto",
                  gap: "1rem",
                  alignItems: "center",
                }}
              >
                <div>
                  <div style={{ fontFamily: "monospace", fontSize: "0.95rem", fontWeight: 600 }}>
                    {u.username}
                  </div>
                  <div style={{ fontSize: "0.75rem", opacity: 0.55, marginTop: "2px" }}>
                    {u.role === "admin" ? "Administrateur" : artistName ?? "—"}
                  </div>
                </div>

                <div className={tab.row}>
                  <select
                    className={tab.inputField}
                    value={u.role}
                    disabled={isBusy}
                    onChange={(e) => changeRole(u, e.target.value as "admin" | "artist")}
                    style={{ minWidth: "110px" }}
                  >
                    <option value="artist">Artiste</option>
                    <option value="admin">Admin</option>
                  </select>
                  {u.role === "artist" && (
                    <select
                      className={tab.inputField}
                      value={u.artist_id ?? ""}
                      disabled={isBusy}
                      onChange={(e) => changeArtistId(u, e.target.value)}
                      style={{ minWidth: "140px" }}
                    >
                      <option value="">— artiste —</option>
                      {artists.map((a) => (
                        <option key={a.id} value={a.id}>{a.name}</option>
                      ))}
                    </select>
                  )}
                </div>

                <div className={tab.row}>
                  <input
                    className={tab.inputField}
                    type="password"
                    placeholder="Nouveau mot de passe"
                    value={newPwd}
                    onChange={(e) =>
                      setEditingPassword((prev) => ({ ...prev, [u.username]: e.target.value }))
                    }
                    style={{ flex: 1, minWidth: "150px" }}
                  />
                  <button
                    type="button"
                    className={tab.btnSm}
                    disabled={isBusy || !newPwd}
                    onClick={() => resetPassword(u)}
                  >
                    <i className="fas fa-key" /> Reset
                  </button>
                </div>

                <button
                  type="button"
                  className="btn btn-danger"
                  disabled={isBusy}
                  onClick={() => remove(u)}
                  title="Supprimer le compte"
                >
                  <i className="fas fa-trash" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
