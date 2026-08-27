"use client";
import { useState, useEffect, useCallback } from "react";
import type { DiscountCode, DiscountType, ArtistProfile } from "@/types";
import { useAuth } from "@/hooks/useAuth";
import tab from "./tab.module.css";

interface FormState {
  code: string;
  type: DiscountType;
  value: string;            // string in form, parsed on submit
  artist_id: string;        // "" = global
  max_uses: string;         // "" = unlimited
  expires_at: string;       // "" = no expiry (YYYY-MM-DD)
  enabled: boolean;
}

const EMPTY_FORM: FormState = {
  code: "",
  type: "percent",
  value: "",
  artist_id: "",
  max_uses: "",
  expires_at: "",
  enabled: true,
};

function fmtValue(d: DiscountCode): string {
  return d.type === "percent" ? `-${d.value}%` : `-${(d.value / 100).toFixed(2)}€`;
}

function fmtUsage(d: DiscountCode): string {
  return d.max_uses != null ? `${d.used_count} / ${d.max_uses}` : `${d.used_count} / ∞`;
}

function fmtExpiry(s?: string): string {
  if (!s) return "—";
  return s.slice(0, 10);
}

export default function DiscountsTab() {
  const { isAdmin, isArtist, auth } = useAuth();
  const [codes, setCodes] = useState<DiscountCode[]>([]);
  const [artists, setArtists] = useState<ArtistProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [codesRes, artistsRaw] = await Promise.all([
        fetch("/api/shop/discounts").then((r) => r.json()),
        fetch("/api/artists/profiles").then((r) => r.json()).catch(() => []),
      ]);
      if (codesRes.status === "success") setCodes(codesRes.data ?? []);
      if (Array.isArray(artistsRaw)) setArtists(artistsRaw);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function resetForm() {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setError(null);
  }

  function loadIntoForm(d: DiscountCode) {
    setEditingId(d.id);
    setError(null);
    setForm({
      code: d.code,
      type: d.type,
      value: d.type === "percent" ? String(d.value) : (d.value / 100).toFixed(2),
      artist_id: d.artist_id ?? "",
      max_uses: d.max_uses != null ? String(d.max_uses) : "",
      expires_at: d.expires_at ? d.expires_at.slice(0, 10) : "",
      enabled: d.enabled,
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    // Build payload
    const valueNum = parseFloat(form.value.replace(",", "."));
    if (!Number.isFinite(valueNum) || valueNum <= 0) {
      setError("Valeur invalide.");
      setSaving(false);
      return;
    }
    const payload = {
      code: form.code.trim(),
      type: form.type,
      value: form.type === "percent" ? Math.round(valueNum) : Math.round(valueNum * 100),
      artist_id: isArtist ? (auth?.artist_id ?? null) : (form.artist_id || null),
      max_uses: form.max_uses ? Math.max(1, Math.round(Number(form.max_uses))) : null,
      expires_at: form.expires_at || null,
      enabled: form.enabled,
    };

    try {
      const url = editingId ? `/api/shop/discounts/${editingId}` : "/api/shop/discounts";
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.status !== "success") {
        setError(data.message ?? "Erreur");
      } else {
        resetForm();
        await load();
      }
    } catch {
      setError("Erreur de connexion.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleEnabled(d: DiscountCode) {
    await fetch(`/api/shop/discounts/${d.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !d.enabled }),
    });
    await load();
  }

  async function remove(d: DiscountCode) {
    if (!confirm(`Supprimer le code "${d.code}" ?`)) return;
    await fetch(`/api/shop/discounts/${d.id}`, { method: "DELETE" });
    if (editingId === d.id) resetForm();
    await load();
  }

  return (
    <div className={tab.tab}>
      <div className={tab.rowBetween}>
        <h2 className={tab.tabTitle}>Codes promo</h2>
        <span style={{ fontSize: "0.8rem", opacity: 0.5 }}>
          La réduction est répartie proportionnellement (artiste & plateforme).
        </span>
      </div>

      {/* ── Form ─────────────────────────────────────────────────────────── */}
      <form onSubmit={submit} className={tab.form} style={cardStyle}>
        <div className={tab.rowBetween}>
          <strong style={{ fontFamily: "'Syne', sans-serif", fontSize: "1.1rem" }}>
            {editingId ? "Modifier le code" : "Nouveau code"}
          </strong>
          {editingId && (
            <button type="button" className={tab.btnSm} onClick={resetForm}>
              <i className="fas fa-plus" /> Nouveau
            </button>
          )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem" }}>
          <label className={tab.label}>
            Code
            <input
              className={tab.inputField}
              type="text"
              required
              maxLength={40}
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              placeholder="SUMMER25"
              style={{ fontFamily: "monospace", letterSpacing: "0.05em" }}
            />
          </label>

          <label className={tab.label}>
            Type
            <select
              className={tab.inputField}
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value as DiscountType })}
            >
              <option value="percent">Pourcentage (%)</option>
              <option value="fixed">Montant fixe (€)</option>
            </select>
          </label>

          <label className={tab.label}>
            {form.type === "percent" ? "Valeur (%)" : "Valeur (€)"}
            <input
              className={tab.inputField}
              type="number"
              required
              min={form.type === "percent" ? 1 : 0.01}
              max={form.type === "percent" ? 100 : undefined}
              step={form.type === "percent" ? 1 : 0.01}
              value={form.value}
              onChange={(e) => setForm({ ...form, value: e.target.value })}
              placeholder={form.type === "percent" ? "25" : "5.00"}
            />
          </label>

          <label className={tab.label}>
            {isArtist ? "Artiste" : "Artiste (vide = global)"}
            <select
              className={tab.inputField}
              value={isArtist ? (auth?.artist_id ?? "") : form.artist_id}
              onChange={(e) => setForm({ ...form, artist_id: e.target.value })}
              disabled={isArtist}
            >
              {isAdmin && <option value="">Tous les artistes</option>}
              {(isArtist
                ? artists.filter((a) => a.id === auth?.artist_id)
                : artists
              ).map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </label>

          <label className={tab.label}>
            Utilisations max (vide = ∞)
            <input
              className={tab.inputField}
              type="number"
              min={1}
              value={form.max_uses}
              onChange={(e) => setForm({ ...form, max_uses: e.target.value })}
              placeholder="100"
            />
          </label>

          <label className={tab.label}>
            Expire le (optionnel)
            <input
              className={tab.inputField}
              type="date"
              value={form.expires_at}
              onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
            />
          </label>
        </div>

        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.85rem" }}>
          <input
            type="checkbox"
            checked={form.enabled}
            onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
          />
          Activé
        </label>

        {error && <div style={{ color: "#f87171", fontSize: "0.85rem" }}>{error}</div>}

        <div style={{ display: "flex", gap: 8 }}>
          <button type="submit" className={tab.btnSm} disabled={saving} style={primaryBtnStyle}>
            {saving ? <><i className="fas fa-circle-notch fa-spin" /> Enregistrement…</> : (editingId ? "Mettre à jour" : "Créer le code")}
          </button>
          {editingId && (
            <button type="button" className={tab.btnSm} onClick={resetForm}>Annuler</button>
          )}
        </div>
      </form>

      {/* ── List ─────────────────────────────────────────────────────────── */}
      <div style={cardStyle}>
        <div className={tab.rowBetween} style={{ marginBottom: "0.75rem" }}>
          <strong style={{ fontFamily: "'Syne', sans-serif", fontSize: "1.1rem" }}>
            Codes existants ({codes.length})
          </strong>
        </div>

        {loading ? (
          <div className={tab.loading}>Chargement…</div>
        ) : codes.length === 0 ? (
          <div className={tab.loading}>Aucun code créé pour le moment.</div>
        ) : (
          <div className={tab.tableWrap}>
            <table className={tab.table}>
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Réduction</th>
                  <th>Portée</th>
                  <th>Usage</th>
                  <th>Expire</th>
                  <th>Actif</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {codes.map((d) => {
                  const artistName = d.artist_id
                    ? artists.find((a) => a.id === d.artist_id)?.name ?? d.artist_id
                    : "Global";
                  return (
                    <tr key={d.id} style={{ opacity: d.enabled ? 1 : 0.5 }}>
                      <td style={{ fontFamily: "monospace", fontWeight: 700, letterSpacing: "0.04em" }}>
                        {d.code}
                      </td>
                      <td style={{ fontWeight: 700, color: "#a8ffd0" }}>{fmtValue(d)}</td>
                      <td style={{ fontSize: "0.85rem" }}>{artistName}</td>
                      <td>{fmtUsage(d)}</td>
                      <td>{fmtExpiry(d.expires_at)}</td>
                      <td>
                        <input
                          type="checkbox"
                          checked={d.enabled}
                          onChange={() => toggleEnabled(d)}
                          title={d.enabled ? "Désactiver" : "Activer"}
                        />
                      </td>
                      <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                        <button className={tab.btnSm} onClick={() => loadIntoForm(d)} style={{ marginRight: 6 }}>
                          <i className="fas fa-pen" />
                        </button>
                        <button className={tab.btnDanger} onClick={() => remove(d)}>
                          <i className="fas fa-trash" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Inline styles (light, no new module CSS file needed) ─────────────────────
const cardStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.02)",
  border: "1px solid rgba(255,255,255,0.06)",
  borderRadius: 12,
  padding: "1.25rem",
};

const primaryBtnStyle: React.CSSProperties = {
  background: "rgba(0,255,104,0.18)",
  border: "1px solid rgba(0,255,104,0.5)",
  color: "#a8ffd0",
};
