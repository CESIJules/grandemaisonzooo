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
        <section className={styles.card}>
          <h3 className={styles.cardTitle}>Upload fichier</h3>
          <input type="file" accept=".mp3,.wav,.flac,.ogg,.aac,.m4a" onChange={handleUpload} className={styles.fileInput} />
          {uploadStatus && <p className={styles.dim}>{uploadStatus}</p>}
        </section>

        <section className={styles.card}>
          <h3 className={styles.cardTitle}>Télécharger YouTube</h3>
          <div className={styles.row}>
            <input
              type="url"
              placeholder="URL YouTube"
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              className={styles.inputField}
            />
            <button className={styles.btn} onClick={handleYoutube} disabled={dlLoading}>
              {dlLoading ? "..." : <i className="fas fa-download" />}
            </button>
          </div>
        </section>
      </div>

      <section className={styles.card}>
        <h3 className={styles.cardTitle}>Bibliothèque ({files.length})</h3>
        {loading ? <p className={styles.dim}>Chargement...</p> : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead><tr><th>Fichier</th><th></th></tr></thead>
              <tbody>
                {files.map((f) => (
                  <tr key={f}>
                    <td>{f}</td>
                    <td>
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
      </section>
    </div>
  );
}
