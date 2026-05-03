"use client";
import { useEffect, useState } from "react";
import type { Vst } from "@/types";
import styles from "./VstSection.module.css";

export default function VstSection() {
  const [vsts, setVsts] = useState<Vst[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeScreenshot, setActiveScreenshot] = useState<Record<number, number>>({});

  useEffect(() => {
    fetch("/api/vsts")
      .then((r) => r.json())
      .then((data: Vst[]) => setVsts(Array.isArray(data) ? data : []))
      .catch(() => setVsts([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading || vsts.length === 0) return null;

  function prev(vst: Vst) {
    setActiveScreenshot((p) => ({
      ...p,
      [vst.id]: ((p[vst.id] ?? 0) - 1 + vst.screenshots.length) % vst.screenshots.length,
    }));
  }

  function next(vst: Vst) {
    setActiveScreenshot((p) => ({
      ...p,
      [vst.id]: ((p[vst.id] ?? 0) + 1) % vst.screenshots.length,
    }));
  }

  return (
    <section id="vst" className="screen">
      <div className={styles.header}>
        <h2 className={styles.title}>VST</h2>
        <span className={styles.subtitle}>PLUGINS AUDIO</span>
      </div>

      <div className={styles.list}>
        {vsts.map((vst) => {
          const idx = activeScreenshot[vst.id] ?? 0;
          const hasMany = vst.screenshots.length > 1;

          return (
            <article key={vst.id} className={styles.card}>

              {/* ── Screenshot panel ── */}
              <div className={styles.screenshotPanel}>
                {vst.screenshots.length > 0 ? (
                  <img
                    key={vst.screenshots[idx]}
                    src={vst.screenshots[idx]}
                    alt={`${vst.name} screenshot ${idx + 1}`}
                    className={styles.screenshot}
                    style={{ objectPosition: vst.screenshotPositions?.[idx] ?? "50% 0%" }}
                  />
                ) : (
                  <div className={styles.screenshotEmpty}>
                    <i className="fas fa-plug" />
                  </div>
                )}

                {hasMany && (
                  <>
                    <button className={`${styles.arrow} ${styles.arrowL}`} onClick={() => prev(vst)} aria-label="Précédent">
                      <i className="fas fa-chevron-left" />
                    </button>
                    <button className={`${styles.arrow} ${styles.arrowR}`} onClick={() => next(vst)} aria-label="Suivant">
                      <i className="fas fa-chevron-right" />
                    </button>
                    <div className={styles.dots}>
                      {vst.screenshots.map((_, i) => (
                        <button
                          key={i}
                          className={`${styles.dot} ${i === idx ? styles.dotActive : ""}`}
                          onClick={() => setActiveScreenshot((p) => ({ ...p, [vst.id]: i }))}
                          aria-label={`Screenshot ${i + 1}`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* ── Info panel ── */}
              <div className={styles.infoPanel}>
                <div className={styles.infoTop}>
                  <h3 className={styles.vstName}>{vst.name}</h3>
                  <div className={styles.chips}>
                    {vst.version && <span className={styles.chip}>v{vst.version}</span>}
                    <span className={styles.chip}>
                      {new Date(vst.releaseDate).toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}
                    </span>
                  </div>
                </div>

                <p className={styles.description}>{vst.description}</p>

                {vst.downloadUrl && (
                  <a
                    href={vst.downloadUrl}
                    className={`btn ${styles.dlBtn}`}
                    download={
                      vst.downloadUrl.startsWith("/uploads/")
                        ? (vst.downloadFilename ?? true)
                        : undefined
                    }
                    target={vst.downloadUrl.startsWith("/uploads/") ? undefined : "_blank"}
                    rel="noreferrer"
                  >
                    <i className="fas fa-download" />
                    Télécharger
                  </a>
                )}
              </div>

            </article>
          );
        })}
      </div>
    </section>
  );
}
