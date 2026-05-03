"use client";
import { useState, useEffect, useCallback } from "react";
import styles from "./tab.module.css";

interface AuditEntry {
  id: number;
  timestamp: string;
  user: string;
  action: string;
  target: string | null;
  ip: string | null;
}

interface Pagination {
  limit: number;
  offset: number;
  total: number;
}

const PAGE_SIZE = 50;

export default function AuditTab() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ limit: PAGE_SIZE, offset: 0, total: 0 });
  const [loading, setLoading] = useState(false);
  const [filterUser, setFilterUser] = useState("");
  const [page, setPage] = useState(0);

  const load = useCallback(async (p: number, user: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String(p * PAGE_SIZE),
      });
      if (user) params.set("user", user);
      const res = await fetch(`/api/audit?${params}`);
      if (!res.ok) return;
      const data = await res.json();
      setEntries(data.data ?? []);
      setPagination(data.pagination ?? { limit: PAGE_SIZE, offset: 0, total: 0 });
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(page, filterUser);
  }, [load, page, filterUser]);

  const totalPages = Math.ceil(pagination.total / PAGE_SIZE);

  return (
    <div className={styles.tab}>
      <h2 className={styles.tabTitle}>Journal d&apos;audit</h2>

      <div className={styles.card}>
        <div className={styles.rowBetween}>
          <div className={styles.row}>
            <input
              type="text"
              placeholder="Filtrer par utilisateur"
              value={filterUser}
              onChange={(e) => { setFilterUser(e.target.value); setPage(0); }}
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "6px",
                padding: "0.4rem 0.75rem",
                color: "inherit",
                fontSize: "0.85rem",
              }}
            />
            <button className={styles.btnSm} onClick={() => load(page, filterUser)}>
              <i className="fas fa-sync" /> Actualiser
            </button>
          </div>
          <span className={styles.dim} style={{ fontSize: "0.8rem" }}>
            {pagination.total} entrée(s) au total
          </span>
        </div>

        {loading ? (
          <p className={styles.dim}>Chargement…</p>
        ) : entries.length === 0 ? (
          <p className={styles.dim}>Aucune entrée dans le journal.</p>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Utilisateur</th>
                  <th>Action</th>
                  <th>Cible</th>
                  <th>IP</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id}>
                    <td className={styles.dim} style={{ whiteSpace: "nowrap", fontSize: "0.75rem" }}>
                      {e.timestamp}
                    </td>
                    <td>
                      <span className={styles.badge}>{e.user}</span>
                    </td>
                    <td>{e.action}</td>
                    <td className={styles.dim}>{e.target ?? "—"}</td>
                    <td className={styles.dim} style={{ fontSize: "0.75rem" }}>{e.ip ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className={styles.row} style={{ justifyContent: "center", gap: "0.5rem" }}>
            <button
              className={styles.btnSm}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              ← Précédent
            </button>
            <span className={styles.dim} style={{ fontSize: "0.8rem" }}>
              Page {page + 1} / {totalPages}
            </span>
            <button
              className={styles.btnSm}
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
            >
              Suivant →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
