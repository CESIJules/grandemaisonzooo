"use client";
import { useState, useEffect, useCallback } from "react";
import type { ProductWithTiers, ShopConfig, ArtistProfile, SaleRow, ArtistPayout } from "@/types";
import { LICENSE_PRESETS as PUBLIC_LICENSE_PRESETS, findPresetByName } from "@/lib/licensePresets";

interface ConnectStatus {
  configured: boolean;
  artistId: string | null;
  hasAccount: boolean;
  chargesEnabled: boolean;
  detailsSubmitted: boolean;
}

// ─── Types for the edit form ─────────────────────────────────────────────────
interface TierForm {
  id?: string;
  name: string;
  priceEuros: string;
  license_type: string;
  is_exclusive: boolean;
  file: File | null;
  existingFileName?: string;
}

interface ProductForm {
  title: string;
  description: string;
  artist_id: string;
  bpm: string;
  music_key: string;
  status: "draft" | "published";
}

const EMPTY_FORM: ProductForm = {
  title: "",
  description: "",
  artist_id: "",
  bpm: "",
  music_key: "",
  status: "draft",
};

function emptyTier(): TierForm {
  return { name: "", priceEuros: "", license_type: "", is_exclusive: false, file: null };
}

// ─── Presets pour l'admin (raccourcis cliquables) ─────────────────────────
// Aligned with public license presets — picking a preset name auto-fills
// the license_type label and the "exclusive" checkbox on the public page.
const TIER_NAME_PRESETS = PUBLIC_LICENSE_PRESETS.map((p) => p.name);
const LICENSE_PRESETS = PUBLIC_LICENSE_PRESETS.map((p) => p.license_type);

const chipStyle: React.CSSProperties = {
  fontFamily: "'Space Grotesk', sans-serif",
  fontSize: "0.65rem",
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  padding: "4px 10px",
  borderRadius: 999,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.04)",
  color: "rgba(255,255,255,0.75)",
  cursor: "pointer",
  transition: "background 0.15s ease, border-color 0.15s ease",
};
const chipActiveStyle: React.CSSProperties = {
  ...chipStyle,
  background: "rgba(0, 255, 104, 0.14)",
  borderColor: "rgba(0, 255, 104, 0.45)",
  color: "#a8ffd0",
};

function PresetChips({
  presets, value, onPick,
}: { presets: string[]; value: string; onPick: (v: string) => void }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", marginTop: "0.35rem" }}>
      {presets.map((p) => {
        const active = value.trim().toLowerCase() === p.toLowerCase();
        return (
          <button
            key={p}
            type="button"
            onClick={() => onPick(p)}
            style={active ? chipActiveStyle : chipStyle}
          >
            {p}
          </button>
        );
      })}
    </div>
  );
}

function eurosToCents(v: string): number {
  const n = parseFloat(v.replace(",", "."));
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}
function centsToEuros(c: number): string {
  return (c / 100).toFixed(2);
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function ShopTab() {
  const [role, setRole] = useState<string>("");
  const [config, setConfig] = useState<ShopConfig | null>(null);
  const [products, setProducts] = useState<ProductWithTiers[]>([]);
  const [artists, setArtists] = useState<ArtistProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<ProductForm>(EMPTY_FORM);
  const [tiers, setTiers] = useState<TierForm[]>([emptyTier()]);
  const [cover, setCover] = useState<File | null>(null);
  const [preview, setPreview] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const [connect, setConnect] = useState<ConnectStatus | null>(null);
  const [connecting, setConnecting] = useState<string | null>(null); // artistId being connected

  const [sales, setSales] = useState<SaleRow[]>([]);
  const [payouts, setPayouts] = useState<ArtistPayout[]>([]);
  const [liveMode, setLiveMode] = useState(false);

  const isAdmin = role === "admin";
  const commissionPct = config?.commissionPct ?? 10;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [meRes, cfgRes, prodRes] = await Promise.all([
        fetch("/api/auth/check"),
        fetch("/api/shop/config"),
        fetch("/api/shop/products"),
      ]);
      const me = await meRes.json();
      setRole(me.role ?? "");
      const cfg = await cfgRes.json();
      if (cfg.status === "success") setConfig(cfg.data);
      const prod = await prodRes.json();
      if (prod.status === "success") setProducts(prod.data);

      const conn = await fetch("/api/shop/connect").then((r) => r.json());
      if (conn.status === "success") setConnect(conn.data);

      // Sales ledger (admin sees all, artist sees own)
      try {
        const s = await fetch("/api/shop/sales").then((r) => r.json());
        if (s.status === "success") {
          setSales(s.data.sales ?? []);
          setPayouts(s.data.payouts ?? []);
          setLiveMode(!!s.data.liveMode);
        }
      } catch { /* ignore */ }

      if (me.role === "admin") {
        const a: ArtistProfile[] = await fetch("/api/artists/profiles").then((r) => r.json());
        const list = Array.isArray(a) ? a : [];
        setArtists(list);
        // Refresh Stripe status for any artist that already has a Connect account,
        // so the admin sees an up-to-date "chargesEnabled" instead of a stale JSON snapshot.
        const toRefresh = list.filter((x) => x.stripeAccountId && !x.stripeChargesEnabled);
        if (toRefresh.length > 0) {
          const refreshed = await Promise.all(
            toRefresh.map(async (x) => {
              try {
                const r = await fetch(`/api/shop/connect?artist_id=${encodeURIComponent(x.id)}`).then((r) => r.json());
                if (r.status === "success") return { id: x.id, data: r.data };
              } catch { /* ignore */ }
              return null;
            })
          );
          setArtists((prev) =>
            prev.map((x) => {
              const r = refreshed.find((rr) => rr?.id === x.id);
              if (!r) return x;
              return {
                ...x,
                stripeChargesEnabled: r.data.chargesEnabled,
                stripeDetailsSubmitted: r.data.detailsSubmitted,
              };
            })
          );
        }
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Config (admin) ──
  async function saveConfig(patch: Partial<ShopConfig>) {
    if (!config) return;
    const next = { ...config, ...patch };
    setConfig(next);
    await fetch("/api/shop/config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next),
    });
  }

  // ── Form helpers ──
  function openAdd() {
    setEditId(null);
    setForm({ ...EMPTY_FORM, artist_id: isAdmin ? "" : "" });
    setTiers([emptyTier()]);
    setCover(null);
    setPreview(null);
    setMsg(null);
    setShowForm(true);
  }

  function openEdit(p: ProductWithTiers) {
    setEditId(p.id);
    setForm({
      title: p.title,
      description: p.description ?? "",
      artist_id: p.artist_id,
      bpm: p.bpm?.toString() ?? "",
      music_key: p.music_key ?? "",
      status: p.status,
    });
    setTiers(
      p.tiers.length
        ? p.tiers.map((t) => ({
            id: t.id,
            name: t.name,
            priceEuros: centsToEuros(t.price_cents),
            license_type: t.license_type ?? "",
            is_exclusive: t.is_exclusive,
            file: null,
            existingFileName: t.file_name,
          }))
        : [emptyTier()]
    );
    setCover(null);
    setPreview(null);
    setMsg(null);
    setShowForm(true);
  }

  function cancel() {
    setShowForm(false);
    setEditId(null);
    setMsg(null);
  }

  function setTier(i: number, patch: Partial<TierForm>) {
    setTiers((prev) => prev.map((t, idx) => (idx === i ? { ...t, ...patch } : t)));
  }
  function addTier() { setTiers((prev) => [...prev, emptyTier()]); }
  function removeTier(i: number) {
    setTiers((prev) => (prev.length <= 1 ? prev : prev.filter((_, idx) => idx !== i)));
  }

  async function save() {
    setMsg(null);
    // Validation
    if (!form.title.trim()) { setMsg({ text: "Titre requis.", ok: false }); return; }
    if (isAdmin && !form.artist_id) { setMsg({ text: "Sélectionne un artiste.", ok: false }); return; }
    if (tiers.some((t) => !t.name.trim())) { setMsg({ text: "Chaque palier doit avoir un nom.", ok: false }); return; }
    // New tiers (no id) must have a deliverable file
    if (tiers.some((t) => !t.id && !t.file)) {
      setMsg({ text: "Chaque nouveau palier doit avoir un fichier à livrer.", ok: false });
      return;
    }

    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("title", form.title);
      fd.append("description", form.description);
      fd.append("status", form.status);
      if (form.bpm) fd.append("bpm", form.bpm);
      if (form.music_key) fd.append("music_key", form.music_key);
      if (isAdmin) fd.append("artist_id", form.artist_id);
      if (cover) fd.append("cover", cover);
      if (preview) fd.append("preview", preview);

      const tiersMeta = tiers.map((t, i) => ({
        id: t.id,
        name: t.name.trim(),
        price_cents: eurosToCents(t.priceEuros),
        license_type: t.license_type.trim() || undefined,
        is_exclusive: t.is_exclusive,
        sort_order: i,
      }));
      fd.append("tiers", JSON.stringify(tiersMeta));
      tiers.forEach((t, i) => { if (t.file) fd.append(`tier_file_${i}`, t.file); });

      const url = editId ? `/api/shop/products/${editId}` : "/api/shop/products";
      const method = editId ? "PUT" : "POST";
      const res = await fetch(url, { method, body: fd });
      let data: { status?: string; message?: string } | null = null;
      try { data = await res.json(); } catch { /* non-JSON response */ }
      if (data?.status === "success") {
        setMsg({ text: editId ? "Prod mise à jour." : "Prod créée.", ok: true });
        setShowForm(false);
        setEditId(null);
        load();
      } else {
        const detail = data?.message ?? `HTTP ${res.status} ${res.statusText}`;
        console.error("[ShopTab] save failed", { status: res.status, data });
        setMsg({ text: `Erreur : ${detail}`, ok: false });
      }
    } catch (err) {
      console.error("[ShopTab] save threw", err);
      setMsg({ text: `Erreur réseau : ${(err as Error)?.message ?? "inconnue"}`, ok: false });
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Supprimer cette prod et ses fichiers ?")) return;
    await fetch(`/api/shop/products/${id}`, { method: "DELETE" });
    load();
  }

  async function connectStripe(artistId?: string) {
    setConnecting(artistId ?? "self");
    try {
      const url = artistId
        ? `/api/shop/connect?artist_id=${encodeURIComponent(artistId)}`
        : "/api/shop/connect";
      const res = await fetch(url, { method: "POST" });
      const data = await res.json();
      if (data.status === "success" && data.data?.url) {
        window.location.href = data.data.url;
      } else {
        setMsg({ text: data.message ?? "Erreur Stripe", ok: false });
        setConnecting(null);
      }
    } catch {
      setMsg({ text: "Erreur de connexion \u00e0 Stripe.", ok: false });
      setConnecting(null);
    }
  }

  function artistLabel(id: string): string {
    return artists.find((a) => a.id === id)?.name ?? id;
  }

  if (loading) {
    return <div style={{ color: "var(--text-secondary)", padding: "1rem" }}>Chargement...</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem", flexWrap: "wrap" }}>
        <h2 style={{ fontSize: "2rem", fontWeight: 800, margin: 0 }}>Boutique</h2>
        <button className="btn btn-primary" onClick={showForm ? cancel : openAdd}>
          {showForm ? <><i className="fas fa-times" /> Annuler</> : <><i className="fas fa-plus" /> Nouvelle prod</>}
        </button>
      </div>

      {/* Stripe Connect — single card (artist mode) */}
      {!isAdmin && connect && connect.artistId && (
        <div className="card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
          <div>
            <h3 style={{ fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-secondary)", margin: "0 0 0.4rem" }}>
              Paiements Stripe
            </h3>
            {!connect.configured ? (
              <span style={{ color: "#fbbf24", fontSize: "0.9rem" }}>
                <i className="fas fa-exclamation-triangle" /> Stripe pas encore configuré côté serveur.
              </span>
            ) : connect.chargesEnabled ? (
              <span style={{ color: "#4ade80", fontSize: "0.9rem" }}>
                <i className="fas fa-check-circle" /> Compte connecté — tu peux vendre. Ta commission ({commissionPct}%) revient à GRANDEMAISON.
              </span>
            ) : connect.hasAccount ? (
              <span style={{ color: "#fbbf24", fontSize: "0.9rem" }}>
                <i className="fas fa-hourglass-half" /> Onboarding Stripe incomplet — termine la configuration pour pouvoir vendre.
              </span>
            ) : (
              <span style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                Connecte ton compte Stripe pour recevoir les paiements de tes prods directement.
              </span>
            )}
          </div>
          {connect.configured && !connect.chargesEnabled && (
            <button className="btn btn-primary" onClick={() => connectStripe()} disabled={connecting !== null}>
              {connecting ? "Redirection..." : connect.hasAccount ? "Terminer la configuration" : "Connecter mon Stripe"}
            </button>
          )}
        </div>
      )}

      {/* Stripe Connect — admin overview table */}
      {isAdmin && (
        <div className="card">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
            <h3 style={{ fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-secondary)", margin: 0 }}>
              Comptes Stripe des artistes
            </h3>
            {!connect?.configured && (
              <span style={{ color: "#fbbf24", fontSize: "0.85rem" }}>
                <i className="fas fa-exclamation-triangle" /> Clé API Stripe absente — ajoute-la dans <code>.env.local</code> et redémarre le service.
              </span>
            )}
          </div>
          {artists.length === 0 ? (
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", margin: 0 }}>Aucun artiste enregistré.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {artists.map((a) => {
                const ready = a.stripeChargesEnabled;
                const pending = !!a.stripeAccountId && !ready;
                return (
                  <div key={a.id} style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem",
                    padding: "0.75rem 1rem", borderRadius: 10,
                    background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
                    flexWrap: "wrap",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", minWidth: 0 }}>
                      <span style={{ fontWeight: 700 }}>{a.name}</span>
                      {ready && <span style={{ fontSize: "0.72rem", color: "#4ade80" }}><i className="fas fa-check-circle" /> Connecté</span>}
                      {pending && <span style={{ fontSize: "0.72rem", color: "#fbbf24" }}><i className="fas fa-hourglass-half" /> Onboarding en cours</span>}
                      {!a.stripeAccountId && <span style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>Pas de compte Stripe</span>}
                    </div>
                    {connect?.configured && !ready && (
                      <button
                        className="btn"
                        onClick={() => connectStripe(a.id)}
                        disabled={connecting !== null}
                      >
                        {connecting === a.id ? "Redirection..." : pending ? "Terminer la configuration" : "Connecter"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          <p style={{ marginTop: "0.75rem", fontSize: "0.78rem", color: "var(--text-secondary)" }}>
            Astuce : chaque artiste peut aussi connecter son propre compte depuis sa session.
          </p>
        </div>
      )}

      {/* Admin settings */}
      {isAdmin && config && (
        <div className="card">
          <h3 style={{ fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-secondary)", margin: "0 0 1rem" }}>
            Paramètres boutique
          </h3>
          <div className="form-grid">
            <div className="form-group">
              <label>Commission plateforme (%)</label>
              <input
                type="number" min={0} max={100} step={1}
                value={config.commissionPct}
                onChange={(e) => setConfig({ ...config, commissionPct: Number(e.target.value) })}
                onBlur={(e) => saveConfig({ commissionPct: Number(e.target.value) })}
              />
              <span style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>
                Prélevée sur chaque vente. Le reste revient à l&apos;artiste.
              </span>
            </div>
            <div className="form-group">
              <label>Vente par les artistes</label>
              <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>
                <input
                  type="checkbox"
                  checked={config.artistsCanSell}
                  onChange={(e) => saveConfig({ artistsCanSell: e.target.checked })}
                  style={{ width: "auto" }}
                />
                Autoriser les artistes à gérer leurs prods
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="card">
          <h3 style={{ fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-secondary)", margin: "0 0 1.25rem" }}>
            {editId ? "Modifier la prod" : "Nouvelle prod"}
          </h3>

          <div className="form-grid">
            <div className="form-group">
              <label>Titre *</label>
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Midnight Drive" />
            </div>
            {isAdmin && (
              <div className="form-group">
                <label>Artiste *</label>
                <select value={form.artist_id} onChange={(e) => setForm({ ...form, artist_id: e.target.value })}>
                  <option value="">— Choisir —</option>
                  {artists.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
            )}
            <div className="form-group">
              <label>BPM</label>
              <input type="number" value={form.bpm} onChange={(e) => setForm({ ...form, bpm: e.target.value })} placeholder="140" />
            </div>
            <div className="form-group">
              <label>Tonalité</label>
              <input value={form.music_key} onChange={(e) => setForm({ ...form, music_key: e.target.value })} placeholder="C# min" />
            </div>
            <div className="form-group">
              <label>Statut</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as "draft" | "published" })}>
                <option value="draft">Brouillon</option>
                <option value="published">Publié</option>
              </select>
            </div>
          </div>

          <div className="form-group" style={{ marginTop: "0.75rem" }}>
            <label>Description</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} style={{ width: "100%", resize: "vertical" }} placeholder="Ambiance, style, infos..." />
          </div>

          <div className="form-grid" style={{ marginTop: "0.75rem" }}>
            <div className="form-group">
              <label>Cover (image)</label>
              <input type="file" accept="image/*" onChange={(e) => setCover(e.target.files?.[0] ?? null)} />
            </div>
            <div className="form-group">
              <label>Extrait audio (teaser, mp3)</label>
              <input type="file" accept="audio/*" onChange={(e) => setPreview(e.target.files?.[0] ?? null)} />
            </div>
          </div>

          {/* Tiers */}
          <div style={{ marginTop: "1.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
              <p style={{ fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-secondary)", margin: 0 }}>
                Paliers de licence
              </p>
              <button className="btn" onClick={addTier} type="button"><i className="fas fa-plus" /> Ajouter un palier</button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {tiers.map((t, i) => {
                const cents = eurosToCents(t.priceEuros);
                const share = Math.round(cents * (1 - commissionPct / 100));
                return (
                  <div key={i} style={{ border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "1rem", background: "rgba(255,255,255,0.03)" }}>
                    <div className="form-grid">
                      <div className="form-group">
                        <label>Nom du palier *</label>
                        <input value={t.name} onChange={(e) => setTier(i, { name: e.target.value })} placeholder="MP3 / WAV / TRACK STEMS / FULL MONETIZATION / EXCLUSIVE…" />
                        <PresetChips
                          presets={TIER_NAME_PRESETS}
                          value={t.name}
                          onPick={(v) => {
                            const preset = findPresetByName(v);
                            if (preset) {
                              setTier(i, {
                                name: preset.name,
                                license_type: preset.license_type,
                                is_exclusive: preset.is_exclusive,
                              });
                            } else {
                              setTier(i, { name: v });
                            }
                          }}
                        />
                      </div>
                      <div className="form-group">
                        <label>Prix (€) *</label>
                        <input type="text" inputMode="decimal" value={t.priceEuros} onChange={(e) => setTier(i, { priceEuros: e.target.value })} placeholder="29.99" />
                        {cents > 0 && (
                          <span style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>
                            Artiste reçoit <strong>{centsToEuros(share)} €</strong> · plateforme {centsToEuros(cents - share)} € ({commissionPct}%)
                          </span>
                        )}
                      </div>
                      <div className="form-group">
                        <label>Licence</label>
                        <input value={t.license_type} onChange={(e) => setTier(i, { license_type: e.target.value })} placeholder="Non-exclusive..." />
                        <PresetChips presets={LICENSE_PRESETS} value={t.license_type} onPick={(v) => setTier(i, { license_type: v })} />
                      </div>
                      <div className="form-group">
                        <label>Fichier livrable {t.id ? "(remplacer)" : "*"}</label>
                        <input type="file" onChange={(e) => setTier(i, { file: e.target.files?.[0] ?? null })} />
                        {t.existingFileName && !t.file && (
                          <span style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>Actuel : {t.existingFileName}</span>
                        )}
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "0.5rem" }}>
                      <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", fontSize: "0.85rem" }}>
                        <input type="checkbox" checked={t.is_exclusive} onChange={(e) => setTier(i, { is_exclusive: e.target.checked })} style={{ width: "auto" }} />
                        Licence exclusive
                      </label>
                      {tiers.length > 1 && (
                        <button className="btn btn-danger" type="button" onClick={() => removeTier(i)}><i className="fas fa-trash" /> Retirer</button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {msg && (
            <p style={{ marginTop: "1rem", color: msg.ok ? "#4ade80" : "#f87171", fontSize: "0.9rem" }}>{msg.text}</p>
          )}

          <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.25rem" }}>
            <button className="btn btn-primary" onClick={save} disabled={saving}>
              {saving ? "Enregistrement..." : editId ? "Mettre à jour" : "Créer la prod"}
            </button>
            <button className="btn" onClick={cancel} disabled={saving}>Annuler</button>
          </div>
        </div>
      )}

      {/* List */}
      {!showForm && (
        <>
          {msg && <p style={{ color: msg.ok ? "#4ade80" : "#f87171", fontSize: "0.9rem" }}>{msg.text}</p>}
          {products.length === 0 ? (
            <div className="card" style={{ textAlign: "center", color: "var(--text-secondary)" }}>
              Aucune prod pour l&apos;instant. Clique sur « Nouvelle prod » pour commencer.
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "1.25rem" }}>
              {products.map((p) => {
                const min = p.tiers.length ? Math.min(...p.tiers.map((t) => t.price_cents)) : 0;
                return (
                  <div key={p.id} className="card" style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                      {p.cover_url ? (
                        <img src={p.cover_url} alt={p.title} style={{ width: 56, height: 56, borderRadius: 8, objectFit: "cover" }} />
                      ) : (
                        <div style={{ width: 56, height: 56, borderRadius: 8, background: "rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <i className="fas fa-music" style={{ color: "var(--text-secondary)" }} />
                        </div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.title}</div>
                        <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>{artistLabel(p.artist_id)}</div>
                      </div>
                      <span style={{
                        fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.05em",
                        padding: "2px 8px", borderRadius: 999,
                        background: p.status === "published" ? "rgba(74,222,128,0.15)" : "rgba(255,255,255,0.08)",
                        color: p.status === "published" ? "#4ade80" : "var(--text-secondary)",
                      }}>
                        {p.status === "published" ? "Publié" : "Brouillon"}
                      </span>
                    </div>
                    <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>
                      {p.tiers.length} palier(s) · à partir de <strong style={{ color: "var(--text-primary)" }}>{centsToEuros(min)} €</strong>
                    </div>
                    <div style={{ display: "flex", gap: "0.5rem", marginTop: "auto" }}>
                      <button className="btn" onClick={() => openEdit(p)}><i className="fas fa-edit" /> Éditer</button>
                      <button className="btn btn-danger" onClick={() => remove(p.id)}><i className="fas fa-trash" /></button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Sales ledger ─────────────────────────────────────────────── */}
          <SalesSection
            isAdmin={isAdmin}
            artists={artists}
            sales={sales}
            payouts={payouts}
            currency={config?.currency ?? "eur"}            liveMode={liveMode}          />
        </>
      )}
    </div>
  );
}

// ─── Sales ledger sub-component ─────────────────────────────────────────────
function SalesSection({
  isAdmin,
  artists,
  sales,
  payouts,
  currency,
  liveMode,
}: {
  isAdmin: boolean;
  artists: ArtistProfile[];
  sales: SaleRow[];
  payouts: ArtistPayout[];
  currency: string;
  liveMode: boolean;
}) {
  const nameOf = (id: string) => artists.find((a) => a.id === id)?.name ?? id;

  // Global totals
  const totalGross = sales.reduce((s, r) => s + r.price_cents, 0);
  const totalPlatform = sales.reduce((s, r) => s + r.platform_fee_cents, 0);
  const totalArtists = sales.reduce((s, r) => s + r.artist_share_cents, 0);

  const cur = (currency || "eur").toUpperCase();

  return (
    <div className="card" style={{ marginTop: "2rem" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap", marginBottom: "0.5rem" }}>
        <h3 style={{ fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-secondary)", margin: 0 }}>
          Ventes &amp; reversements
        </h3>
        <span
          title={liveMode ? "Stripe Live — paiements réels" : "Stripe Test — aucun argent réel n'est échangé"}
          style={{
            fontSize: "0.7rem", fontWeight: 800, letterSpacing: "0.08em",
            padding: "3px 10px", borderRadius: 999,
            background: liveMode ? "rgba(74,222,128,0.18)" : "rgba(251,191,36,0.18)",
            color: liveMode ? "#4ade80" : "#fbbf24",
            border: `1px solid ${liveMode ? "rgba(74,222,128,0.45)" : "rgba(251,191,36,0.45)"}`,
          }}
        >
          <i className={`fas ${liveMode ? "fa-bolt" : "fa-flask"}`} /> {liveMode ? "STRIPE LIVE" : "STRIPE TEST"}
        </span>
      </div>

      {/* Summary tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.75rem", marginBottom: "1.25rem" }}>
        <div style={{ padding: "0.85rem 1rem", borderRadius: 10, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-secondary)" }}>Ventes payées</div>
          <div style={{ fontSize: "1.4rem", fontWeight: 800, marginTop: 4 }}>{sales.length}</div>
        </div>
        <div style={{ padding: "0.85rem 1rem", borderRadius: 10, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-secondary)" }}>Volume total</div>
          <div style={{ fontSize: "1.4rem", fontWeight: 800, marginTop: 4 }}>{centsToEuros(totalGross)} {cur}</div>
        </div>
        {isAdmin && (
          <div style={{ padding: "0.85rem 1rem", borderRadius: 10, background: "rgba(192,38,211,0.12)", border: "1px solid rgba(192,38,211,0.35)" }}>
            <div style={{ fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "#e879f9" }}>Commissions GMZ</div>
            <div style={{ fontSize: "1.4rem", fontWeight: 800, marginTop: 4, color: "#fff" }}>{centsToEuros(totalPlatform)} {cur}</div>
          </div>
        )}
        <div style={{ padding: "0.85rem 1rem", borderRadius: 10, background: "rgba(74,222,128,0.12)", border: "1px solid rgba(74,222,128,0.35)" }}>
          <div style={{ fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "#4ade80" }}>
            {isAdmin ? "Reversé aux artistes" : "Mon revenu"}
          </div>
          <div style={{ fontSize: "1.4rem", fontWeight: 800, marginTop: 4, color: "#fff" }}>{centsToEuros(totalArtists)} {cur}</div>
        </div>
      </div>

      {/* Per-artist payouts (admin only, multi-artist) */}
      {isAdmin && payouts.length > 0 && (
        <>
          <h4 style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-secondary)", margin: "0 0 0.5rem" }}>
            Par artiste
          </h4>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", marginBottom: "1.25rem" }}>
            {payouts.map((p) => (
              <div key={p.artist_id} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem",
                padding: "0.55rem 0.9rem", borderRadius: 8,
                background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
              }}>
                <span style={{ fontWeight: 600 }}>{nameOf(p.artist_id)}</span>
                <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                  {p.order_count} vente(s) ·{" "}
                  <strong style={{ color: "#4ade80" }}>{centsToEuros(p.total_share_cents)} {cur}</strong>{" "}
                  reversés · <strong style={{ color: "#e879f9" }}>{centsToEuros(p.total_platform_fee_cents)} {cur}</strong> commission
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Detailed list */}
      <h4 style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-secondary)", margin: "0 0 0.5rem" }}>
        Détail des transactions
      </h4>
      {sales.length === 0 ? (
        <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", margin: 0 }}>
          Aucune vente pour le moment. Les transactions apparaîtront ici dès qu'un paiement est confirmé.
        </p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
            <thead>
              <tr style={{ textAlign: "left", color: "var(--text-secondary)", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                <th style={{ padding: "0.5rem" }}>Date</th>
                <th style={{ padding: "0.5rem" }}>Prod</th>
                {isAdmin && <th style={{ padding: "0.5rem" }}>Artiste</th>}
                <th style={{ padding: "0.5rem" }}>Acheteur</th>
                <th style={{ padding: "0.5rem", textAlign: "right" }}>Total</th>
                {isAdmin && <th style={{ padding: "0.5rem", textAlign: "right" }}>Commission</th>}
                <th style={{ padding: "0.5rem", textAlign: "right" }}>{isAdmin ? "Artiste reçoit" : "Mon part"}</th>
                <th style={{ padding: "0.5rem", textAlign: "center" }}>Stripe</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((r) => {
                const date = (r.paid_at ?? r.created_at).replace("T", " ").slice(0, 16);
                const piUrl = r.stripe_payment_intent
                  ? `https://dashboard.stripe.com${liveMode ? "" : "/test"}/payments/${r.stripe_payment_intent}`
                  : null;
                return (
                  <tr key={`${r.order_id}-${r.product_id}-${r.tier_name}`} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    <td style={{ padding: "0.5rem", whiteSpace: "nowrap", color: "var(--text-secondary)" }}>{date}</td>
                    <td style={{ padding: "0.5rem" }}>
                      <strong>{r.product_title}</strong>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>{r.tier_name}</div>
                    </td>
                    {isAdmin && <td style={{ padding: "0.5rem" }}>{nameOf(r.artist_id)}</td>}
                    <td style={{ padding: "0.5rem", color: "var(--text-secondary)" }}>{r.buyer_email ?? "—"}</td>
                    <td style={{ padding: "0.5rem", textAlign: "right", fontWeight: 600 }}>{centsToEuros(r.price_cents)} {(r.currency || "eur").toUpperCase()}</td>
                    {isAdmin && (
                      <td style={{ padding: "0.5rem", textAlign: "right", color: "#e879f9", fontWeight: 600 }}>
                        {centsToEuros(r.platform_fee_cents)}
                      </td>
                    )}
                    <td style={{ padding: "0.5rem", textAlign: "right", color: "#4ade80", fontWeight: 600 }}>
                      {centsToEuros(r.artist_share_cents)}
                    </td>
                    <td style={{ padding: "0.5rem", textAlign: "center" }}>
                      {piUrl ? (
                        <a href={piUrl} target="_blank" rel="noopener noreferrer" title="Ouvrir dans Stripe" style={{ color: "#60a5fa" }}>
                          <i className="fas fa-external-link-alt" />
                        </a>
                      ) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p style={{ marginTop: "0.85rem", fontSize: "0.78rem", color: "var(--text-secondary)" }}>
        <i className="fas fa-info-circle" /> En direct charges Stripe Connect, l'argent arrive sur le compte de l'artiste,
        et notre commission est prélevée automatiquement via <code>application_fee_amount</code>.
        {" "}Clique sur l'icône pour ouvrir la transaction dans Stripe.
      </p>
    </div>
  );
}
