"use client";
import { useEffect, useState } from "react";
import styles from "./tab.module.css";

export default function MusicTab() {
  const [files, setFiles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [dlLoading, setDlLoading] = useState(false);

  const loadFiles = async () => {
    setLoading(true);
    const res = await fetch("/api/music/files");
    const data = await res.json();
    if (data.status === "success") setFiles(data.files);
    setLoading(false);
  };

  useEffect(() => { loadFiles(); }, []);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    setUploadStatus("Upload en cours...");
    const res = await fetch("/api/music/upload", { method: "POST", body: fd });
    const data = await res.json();
    setUploadStatus(data.message);
    if (data.status === "success") loadFiles();
  }

  async function handleDelete(filename: string) {
    if (!confirm(`Supprimer "${filename}" ?`)) return;
    const res = await fetch("/api/music/delete", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename }),
    });
    const data = await res.json();
    if (data.status === "success") loadFiles();
  }

  async function handleYoutube() {
    if (!youtubeUrl) return;
    setDlLoading(true);
    const res = await fetch("/api/music/download/youtube", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: youtubeUrl }),
    });
    const data = await res.json();
    setDlLoading(false);
    alert(data.message);
    if (data.status === "success") { setYoutubeUrl(""); loadFiles(); }
  }

  return (
    <div className={styles.tab}>
      <h2 className={styles.tabTitle}>Musique</h2>

      <div className={styles.grid2}>
        <div className="card">
          <p style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-secondary)", margin: "0 0 1rem" }}>Upload fichier</p>
          <label style={{ display: "flex", flexDirection: "column", gap: "0.5rem", cursor: "pointer" }}>
            <div style={{ border: "2px dashed rgba(255,255,255,0.15)", borderRadius: "10px", padding: "1.5rem", textAlign: "center", transition: "border-color 0.2s" }}>
              <i className="fas fa-upload" style={{ fontSize: "1.5rem", opacity: 0.5, display: "block", marginBottom: "0.5rem" }} />
              <span style={{ fontSize: "0.85rem", opacity: 0.6 }}>Cliquer pour choisir un fichier audio</span>
            </div>
            <input type="file" accept=".mp3,.wav,.flac,.ogg,.aac,.m4a" onChange={handleUpload} style={{ display: "none" }} />
          </label>
          {uploadStatus && (
            <p style={{ margin: "0.5rem 0 0", fontSize: "0.85rem", color: uploadStatus.includes("succès") ? "#4ade80" : "var(--text-secondary)" }}>
              {uploadStatus}
            </p>
          )}
        </div>

        <div className="card">
          <p style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-secondary)", margin: "0 0 1rem" }}>Télécharger YouTube</p>
          <div className={styles.row}>
            <input
              type="url"
              placeholder="https://youtube.com/watch?v=..."
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleYoutube()}
              className={styles.inputField}
            />
          </div>
          <div style={{ marginTop: "0.75rem" }}>
            <button className="btn btn-primary" onClick={handleYoutube} disabled={dlLoading} style={{ width: "100%" }}>
              {dlLoading ? <><i className="fas fa-spinner fa-spin" /> Téléchargement…</> : <><i className="fas fa-download" /> Télécharger</>}
            </button>
          </div>
        </div>
      </div>

      <div className="card">
        <div className={styles.rowBetween} style={{ marginBottom: "1rem" }}>
          <h3 style={{ margin: 0, fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-secondary)" }}>
            Bibliothèque ({files.length})
          </h3>
          <button className={styles.btnSm} onClick={loadFiles}>
            <i className="fas fa-sync" /> Actualiser
          </button>
        </div>
        {loading ? (
          <p style={{ opacity: 0.4, fontSize: "0.9rem", textAlign: "center", padding: "2rem" }}>Chargement…</p>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead><tr><th>Fichier</th><th style={{ textAlign: "right" }}>Action</th></tr></thead>
              <tbody>
                {files.length === 0 && (
                  <tr><td colSpan={2} style={{ textAlign: "center", opacity: 0.4, padding: "2rem" }}>Aucun fichier</td></tr>
                )}
                {files.map((f) => (
                  <tr key={f}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <i className="fas fa-music" style={{ opacity: 0.3, fontSize: "0.85rem" }} />
                        <span style={{ fontSize: "0.875rem" }}>{f}</span>
                      </div>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <button className={styles.btnDanger} onClick={() => handleDelete(f)}>
                        <i className="fas fa-trash" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
