"use client";
import { useState, useEffect, useRef } from "react";
import type { Vst } from "@/types";
import styles from "./tab.module.css";

// ─── Image cropper ────────────────────────────────────────────────────────────
// Shows a card-proportioned preview with live object-position editing via sliders.

function parsePct(pos: string): [number, number] {
  const parts = pos.trim().split(/\s+/);
  const x = parseFloat(parts[0] ?? "50") || 50;
  const y = parseFloat(parts[1] ?? "0") || 0;
  return [x, y];
}

function ImageCropper({
  src,
  position,
  label,
  onChange,
}: {
  src: string;
  position: string;
  label?: string;
  onChange: (pos: string) => void;
}) {
  const [x, y] = parsePct(position);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      {label && (
        <span style={{ fontSize: "0.7rem", color: "var(--text-secondary)", letterSpacing: "0.05em" }}>{label}</span>
      )}
      {/* Preview — same 11:6 ratio as the card screenshot panel */}
      <div
        style={{
          width: "100%",
          aspectRatio: "11 / 6",
          overflow: "hidden",
          borderRadius: 8,
          background: "#000",
          position: "relative",
          border: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        <img
          src={src}
          alt="preview"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: position,
            display: "block",
          }}
        />
        {/* crosshair dot */}
        <div
          style={{
            position: "absolute",
            left: `${x}%`,
            top: `${y}%`,
            transform: "translate(-50%, -50%)",
            width: 10,
            height: 10,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.9)",
            border: "2px solid rgba(0,0,0,0.6)",
            pointerEvents: "none",
            boxShadow: "0 0 4px rgba(0,0,0,0.8)",
          }}
        />
      </div>

      {/* Sliders */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
        <label style={{ fontSize: "0.68rem", color: "var(--text-secondary)", display: "flex", flexDirection: "column", gap: 4 }}>
          Horizontal ({x}%)
          <input
            type="range" min={0} max={100} value={x}
            onChange={(e) => onChange(`${e.target.value}% ${y}%`)}
            style={{ width: "100%", accentColor: "#fff" }}
          />
        </label>
        <label style={{ fontSize: "0.68rem", color: "var(--text-secondary)", display: "flex", flexDirection: "column", gap: 4 }}>
          Vertical ({y}%)
          <input
            type="range" min={0} max={100} value={y}
            onChange={(e) => onChange(`${x}% ${e.target.value}%`)}
            style={{ width: "100%", accentColor: "#fff" }}
          />
        </label>
      </div>
    </div>
  );
}

// ─── Main tab ─────────────────────────────────────────────────────────────────

type FormState = {
  name: string;
  description: string;
  releaseDate: string;
  version: string;
  downloadUrl: string;
};

const EMPTY_FORM: FormState = {
  name: "",
  description: "",
  releaseDate: "",
  version: "",
  downloadUrl: "",
};

export default function VstTab() {
  const [vsts, setVsts] = useState<Vst[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [screenshots, setScreenshots] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [screenshotPositions, setScreenshotPositions] = useState<string[]>([]);  // for new vst
  const [editPositions, setEditPositions] = useState<string[]>([]);              // for edit mode
  const [editScreenshots, setEditScreenshots] = useState<string[]>([]);          // existing URLs in edit mode
  const [downloadFile, setDownloadFile] = useState<File | null>(null);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [saving, setSaving] = useState(false);
  const screenshotInputRef = useRef<HTMLInputElement>(null);
  const downloadInputRef = useRef<HTMLInputElement>(null);

  // Create / revoke object URLs for new screenshots preview
  useEffect(() => {
    const urls = screenshots.map((f) => URL.createObjectURL(f));
    setPreviewUrls(urls);
    // Default positions: 50% 0% (show top of image)
    setScreenshotPositions(urls.map(() => "50% 0%"));
    return () => { urls.forEach((u) => URL.revokeObjectURL(u)); };
  }, [screenshots]);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/vsts");
      const data = await res.json();
      setVsts(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function set(k: keyof FormState, v: string) {
    setForm((prev) => ({ ...prev, [k]: v }));
  }

  function openAdd() {
    setEditId(null);
    setForm(EMPTY_FORM);
    setScreenshots([]);
    setPreviewUrls([]);
    setScreenshotPositions([]);
    setDownloadFile(null);
    setMsg(null);
    setAdding(true);
    if (screenshotInputRef.current) screenshotInputRef.current.value = "";
    if (downloadInputRef.current) downloadInputRef.current.value = "";
  }

  function openEdit(vst: Vst) {
    setAdding(false);
    setEditId(vst.id);
    setForm({
      name: vst.name,
      description: vst.description,
      releaseDate: vst.releaseDate,
      version: vst.version ?? "",
      downloadUrl: vst.downloadUrl,
    });
    setEditScreenshots(vst.screenshots);
    setEditPositions(vst.screenshots.map((_, i) => vst.screenshotPositions?.[i] ?? "50% 0%"));
    setScreenshots([]);
    setPreviewUrls([]);
    setScreenshotPositions([]);
    setDownloadFile(null);
    setMsg(null);
  }

  function cancelForm() {
    setAdding(false);
    setEditId(null);
    setEditScreenshots([]);
    setEditPositions([]);
    setMsg(null);
  }

  async function save() {
    setMsg(null);
    setSaving(true);
    try {
      if (editId !== null) {
        // PUT — JSON only (no new files in edit mode for simplicity, files managed separately)
        const res = await fetch(`/api/vsts/${editId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.name,
            description: form.description,
            releaseDate: form.releaseDate,
            version: form.version || undefined,
            downloadUrl: form.downloadUrl,
            screenshotPositions: editPositions.length ? editPositions : undefined,
          }),
        });
        const data = await res.json();
        if (data.status === "success") {
          setMsg({ text: "VST mis à jour.", ok: true });
          setEditId(null);
          setEditScreenshots([]);
          setEditPositions([]);
          load();
        } else {
          setMsg({ text: data.message ?? "Erreur", ok: false });
        }
      } else {
        // POST multipart
        const fd = new FormData();
        fd.append("name", form.name);
        fd.append("description", form.description);
        fd.append("releaseDate", form.releaseDate);
        if (form.version) fd.append("version", form.version);
        if (form.downloadUrl) fd.append("downloadUrl", form.downloadUrl);
        if (screenshotPositions.length) fd.append("screenshotPositions", JSON.stringify(screenshotPositions));
        for (const f of screenshots) fd.append("screenshots", f);
        if (downloadFile) fd.append("downloadFile", downloadFile);

        const res = await fetch("/api/vsts", { method: "POST", body: fd });
        const data = await res.json();
        if (data.status === "success") {
          setMsg({ text: "VST ajouté.", ok: true });
          setAdding(false);
          setForm(EMPTY_FORM);
          setScreenshots([]);
          setDownloadFile(null);
          load();
        } else {
          setMsg({ text: data.message ?? "Erreur", ok: false });
        }
      }
    } catch {
      setMsg({ text: "Erreur de connexion.", ok: false });
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: number) {
    if (!confirm("Supprimer ce VST ?")) return;
    await fetch(`/api/vsts/${id}`, { method: "DELETE" });
    load();
  }

  const showForm = adding || editId !== null;

  return (
    <div className={styles.tab}>
      {/* Header */}
      <div className={styles.rowBetween}>
        <h2 className={styles.tabTitle}>VST Plugins</h2>
        <button className="btn btn-primary" onClick={showForm ? cancelForm : openAdd}>
          {showForm ? <><i className="fas fa-times" /> Annuler</> : <><i className="fas fa-plus" /> Nouveau VST</>}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="card">
          <h3 style={{ fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-secondary)", margin: "0 0 1.25rem" }}>
            {editId !== null ? "Modifier le VST" : "Nouveau VST"}
          </h3>
          <div className="form-grid">
            <div className="form-group">
              <label>Nom *</label>
              <input value={form.name} onChange={(e) => set("name", e.target.value)} type="text" placeholder="SuperSynth" />
            </div>
            <div className="form-group">
              <label>Version</label>
              <input value={form.version} onChange={(e) => set("version", e.target.value)} type="text" placeholder="1.0.0" />
            </div>
            <div className="form-group">
              <label>Date de sortie *</label>
              <input value={form.releaseDate} onChange={(e) => set("releaseDate", e.target.value)} type="date" />
            </div>
            <div className="form-group">
              <label>Lien de téléchargement (URL externe)</label>
              <input value={form.downloadUrl} onChange={(e) => set("downloadUrl", e.target.value)} type="url" placeholder="https://..." />
            </div>
          </div>

          <div className="form-group" style={{ marginTop: "0.75rem" }}>
            <label>Description *</label>
            <textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              rows={4}
              placeholder="Décris le plugin..."
              style={{ width: "100%", resize: "vertical" }}
            />
          </div>

          {editId === null && (
            <div className="form-grid" style={{ marginTop: "0.75rem" }}>
              <div className="form-group">
                <label>Screenshots (images)</label>
                <input
                  ref={screenshotInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => setScreenshots(Array.from(e.target.files ?? []))}
                />
                {screenshots.length > 0 && (
                  <span style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>
                    {screenshots.length} fichier(s) sélectionné(s)
                  </span>
                )}
              </div>
              <div className="form-group">
                <label>Fichier à télécharger (si pas d&apos;URL externe)</label>
                <input
                  ref={downloadInputRef}
                  type="file"
                  onChange={(e) => setDownloadFile(e.target.files?.[0] ?? null)}
                />
                {downloadFile && (
                  <span style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>
                    {downloadFile.name}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Screenshot croppers — shown after files are selected (add mode) */}
          {editId === null && previewUrls.length > 0 && (
            <div style={{ marginTop: "1rem" }}>
              <p style={{ fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-secondary)", margin: "0 0 0.75rem" }}>
                Recadrage des screenshots
              </p>
              <div style={{
                display: "grid",
                gridTemplateColumns: previewUrls.length === 1 ? "1fr" : "repeat(auto-fill, minmax(300px, 1fr))",
                gap: "1.25rem",
              }}>
                {previewUrls.map((url, i) => (
                  <ImageCropper
                    key={url}
                    src={url}
                    position={screenshotPositions[i] ?? "50% 0%"}
                    label={`Screenshot ${i + 1} — ${screenshots[i]?.name}`}
                    onChange={(pos) => setScreenshotPositions((prev) => {
                      const next = [...prev];
                      next[i] = pos;
                      return next;
                    })}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Screenshot croppers — shown in edit mode for existing screenshots */}
          {editId !== null && editScreenshots.length > 0 && (
            <div style={{ marginTop: "1rem" }}>
              <p style={{ fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-secondary)", margin: "0 0 0.75rem" }}>
                Recadrage des screenshots
              </p>
              <div style={{
                display: "grid",
                gridTemplateColumns: editScreenshots.length === 1 ? "1fr" : "repeat(auto-fill, minmax(300px, 1fr))",
                gap: "1.25rem",
              }}>
                {editScreenshots.map((url, i) => (
                  <ImageCropper
                    key={url}
                    src={url}
                    position={editPositions[i] ?? "50% 0%"}
                    label={`Screenshot ${i + 1}`}
                    onChange={(pos) => setEditPositions((prev) => {
                      const next = [...prev];
                      next[i] = pos;
                      return next;
                    })}
                  />
                ))}
              </div>
            </div>
          )}

          {msg && (
            <p style={{ color: msg.ok ? "#4ade80" : "#f87171", fontSize: "0.85rem", margin: "0.5rem 0 0" }}>
              {msg.text}
            </p>
          )}
          <div className="form-actions">
            <button className="btn btn-secondary" onClick={cancelForm}>Annuler</button>
            <button className="btn btn-primary" onClick={save} disabled={saving}>
              <i className={`fas ${saving ? "fa-spinner fa-spin" : "fa-check"}`} />
              {saving ? "Enregistrement…" : editId !== null ? "Mettre à jour" : "Publier"}
            </button>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="card" style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)" }}>
          Chargement…
        </div>
      ) : vsts.length === 0 ? (
        <div className="card" style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)" }}>
          Aucun VST pour l&apos;instant.
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          {vsts.map((vst, i) => (
            <div
              key={vst.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "1rem",
                padding: "1rem 1.25rem",
                borderBottom: i < vsts.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none",
              }}
            >
              {/* Thumbnail */}
              {vst.screenshots[0] ? (
                <img
                  src={vst.screenshots[0]}
                  alt={vst.name}
                  style={{ width: 64, height: 40, objectFit: "cover", borderRadius: 6, flexShrink: 0, background: "#111" }}
                />
              ) : (
                <div style={{ width: 64, height: 40, background: "rgba(255,255,255,0.06)", borderRadius: 6, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <i className="fas fa-plug" style={{ color: "rgba(255,255,255,0.25)", fontSize: "1rem" }} />
                </div>
              )}

              {/* Meta */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: "0.9rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {vst.name}
                  {vst.version && <span style={{ fontWeight: 400, color: "var(--text-secondary)", marginLeft: "0.4rem", fontSize: "0.78rem" }}>v{vst.version}</span>}
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: 2 }}>
                  {vst.releaseDate} · {vst.screenshots.length} screenshot(s)
                </div>
              </div>

              {/* Actions */}
              <div className={styles.row}>
                {editId === vst.id ? (
                  <button className={styles.btnSm} onClick={cancelForm}>
                    <i className="fas fa-times" /> Fermer
                  </button>
                ) : (
                  <button className={styles.btnSm} onClick={() => openEdit(vst)}>
                    <i className="fas fa-pen" /> Modifier
                  </button>
                )}
                <button
                  className={styles.btnSm}
                  onClick={() => remove(vst.id)}
                  style={{ color: "#f87171", borderColor: "rgba(248,113,113,0.2)" }}
                >
                  <i className="fas fa-trash" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
