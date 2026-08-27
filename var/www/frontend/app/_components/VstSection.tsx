"use client";
import { useEffect, useState, useMemo } from "react";
import type { Vst } from "@/types";
import styles from "./VstSection.module.css";

// ─── Helpers: infer a category + format from the plugin metadata ─────────────
const TYPE_KEYWORDS: [RegExp, string][] = [
  [/disto|distortion|drive|satur|crush/i, "DISTORTION"],
  [/flanger/i, "FLANGER"],
  [/chorus/i, "CHORUS"],
  [/phaser/i, "PHASER"],
  [/reverb|hall|room|space/i, "REVERB"],
  [/delay|echo/i, "DELAY"],
  [/comp|dynamic|limit|gate/i, "DYNAMICS"],
  [/\beq\b|equal|filter/i, "EQ / FILTER"],
  [/pad|ambient|cloud|swell|atmos|drone/i, "AMBIENT"],
  [/synth|oscill|\bosc\b/i, "SYNTH"],
  [/modul/i, "MODULATION"],
];

function inferType(v: Vst): string {
  const hay = `${v.name} ${v.description}`;
  for (const [re, label] of TYPE_KEYWORDS) if (re.test(hay)) return label;
  return "EFFECT";
}

function inferFormat(v: Vst): string {
  const src = v.downloadFilename || v.downloadUrl || "";
  const m = src.match(/\.([a-z0-9]+)(?:$|\?)/i);
  return m ? m[1].toUpperCase() : "VST3";
}

// ─── Static waveform (decorative, pure CSS bars) ────────────────────────
const WAVE_BARS = 60;
function Waveform() {
  return (
    <div className={styles.wave} aria-hidden="true">
      {Array.from({ length: WAVE_BARS }).map((_, i) => {
        const h = 0.16 + 0.84 * Math.abs(Math.sin(i * 0.5) * Math.cos(i * 0.13) + 0.4 * Math.sin(i * 0.27));
        return <span key={i} className={styles.waveBar} style={{ height: `${Math.min(100, h * 100).toFixed(1)}%` }} />;
      })}
    </div>
  );
}

// ─── Plugin card ──────────────────────────────────────────────────────
function Card({ vst, index }: { vst: Vst; index: number }) {
  const hasImg = vst.screenshots.length > 0;
  const type = inferType(vst);
  const format = inferFormat(vst);
  const dateRaw = new Date(vst.releaseDate).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  const dateStr = dateRaw.charAt(0).toUpperCase() + dateRaw.slice(1);
  const num = String(index + 1).padStart(2, "0");
  const canDownload = Boolean(vst.downloadUrl);

  return (
    <article className={styles.card}>
      <div className={styles.media}>
        {hasImg ? (
          <img
            src={vst.screenshots[0]}
            alt={vst.name}
            className={styles.shot}
            style={{ objectPosition: vst.screenshotPositions?.[0] ?? "50% 50%" }}
          />
        ) : (
          <div className={styles.mediaEmpty}><i className="fas fa-plug" /></div>
        )}
        <span className={styles.fmt}>{format}</span>
      </div>

      <div className={styles.body}>
        <div className={styles.head}>
          <span className={styles.kicker}>{type}</span>
          <span className={styles.rule} />
          <span className={styles.index}>{num}</span>
        </div>

        <h3 className={styles.name}>{vst.name}</h3>
        <Waveform />
        <p className={styles.desc}>{vst.description}</p>

        <div className={styles.foot}>
          <div className={styles.meta}>
            {vst.version && <span className={styles.metaItem}>v{vst.version}</span>}
            {vst.version && <span className={styles.sep} />}
            <span className={styles.metaItem}>{dateStr}</span>
          </div>

          {canDownload ? (
            <a
              href={vst.downloadUrl}
              className={styles.dl}
              download={vst.downloadUrl.startsWith("/uploads/") ? (vst.downloadFilename ?? true) : undefined}
              target={vst.downloadUrl.startsWith("/uploads/") ? undefined : "_blank"}
              rel="noreferrer"
            >
              Télécharger <i className="fas fa-arrow-down-long" />
            </a>
          ) : (
            <span className={`${styles.dl} ${styles.dlLocked}`}>
              Bientôt <i className="fas fa-lock" />
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

// ─── Main section ─────────────────────────────────────────────────────────────
export default function VstSection() {
  const [vsts, setVsts] = useState<Vst[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"recent" | "name" | "version">("recent");

  useEffect(() => {
    fetch("/api/vsts")
      .then((r) => r.json())
      .then((data: Vst[]) => setVsts(Array.isArray(data) ? data : []))
      .catch(() => setVsts([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    const list = q ? vsts.filter(v => v.name.toLowerCase().includes(q) || v.description.toLowerCase().includes(q)) : [...vsts];
    if (sort === "name") list.sort((a, b) => a.name.localeCompare(b.name));
    else if (sort === "version") list.sort((a, b) => (b.version ?? "").localeCompare(a.version ?? ""));
    else list.sort((a, b) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime());
    return list;
  }, [vsts, search, sort]);

  if (loading || vsts.length === 0) return null;

  return (
    <section id="vst" className="screen">
      <div className={styles.header}>
        <h2 className={styles.title}>VST</h2>
        <span className={styles.subtitle}>PLUGINS AUDIO</span>
      </div>

      <div className={styles.console}>
        <span className={styles.count}>
          <b>{String(filtered.length).padStart(2, "0")}</b>
          <span>{filtered.length > 1 ? "Plugins" : "Plugin"}</span>
        </span>
        <div className={styles.searchWrapper}>
          <i className="fas fa-search" />
          <input
            type="text"
            placeholder="Rechercher un plugin…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className={styles.searchInput}
          />
          {search && (
            <button className={styles.clearBtn} onClick={() => setSearch("")} aria-label="Effacer">
              <i className="fas fa-times" />
            </button>
          )}
        </div>
        <div className={styles.sortButtons}>
          <button className={`${styles.sortBtn} ${sort === "recent" ? styles.sortActive : ""}`} onClick={() => setSort("recent")}>Plus récents</button>
          <button className={`${styles.sortBtn} ${sort === "name" ? styles.sortActive : ""}`} onClick={() => setSort("name")}>A → Z</button>
          <button className={`${styles.sortBtn} ${sort === "version" ? styles.sortActive : ""}`} onClick={() => setSort("version")}>Version</button>
        </div>
      </div>

      <div id="vstScroll" className={styles.scrollArea}>
        {filtered.length === 0 ? (
          <p className={styles.noResults}>Aucun plugin trouvé.</p>
        ) : (
          <div className={styles.grid}>
            {filtered.map((vst, i) => <Card key={vst.id} vst={vst} index={i} />)}
          </div>
        )}
      </div>
    </section>
  );
}
