"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Vst } from "@/types";
import styles from "./BoutiqueSection.module.css";

// ─── Types ────────────────────────────────────────────────────────────────────
interface CatalogProduct {
  id: string;
  title: string;
  cover_url?: string;
  bpm?: number;
  music_key?: string;
  artist_id: string;
  artist_name: string;
  purchasable: boolean;
  tiers: { id: string; name: string; price_cents: number; is_exclusive: boolean }[];
}

interface ArtistProfile { id: string; name: string; image?: string; }
interface ArtistEntry   { id: string; name: string; image?: string; prodCount: number; }

// ─── Helpers ──────────────────────────────────────────────────────────────────
const euros = (c: number) => `${(c / 100).toFixed(2)} €`;

const VST_KEYWORDS: [RegExp, string][] = [
  [/disto|distortion|drive|satur|crush/i, "DISTORTION"],
  [/reverb|hall|room|space/i, "REVERB"],
  [/delay|echo/i, "DELAY"],
  [/comp|dynamic|limit|gate/i, "DYNAMICS"],
  [/\beq\b|equal|filter/i, "EQ / FILTER"],
  [/synth|oscill|\bosc\b/i, "SYNTH"],
  [/modul|chorus|phaser|flanger/i, "MODULATION"],
];
function vstType(v: Vst) {
  const h = `${v.name} ${v.description}`;
  for (const [r, l] of VST_KEYWORDS) if (r.test(h)) return l;
  return "EFFECT";
}
function vstFmt(v: Vst) {
  const m = (v.downloadFilename || v.downloadUrl || "").match(/\.([a-z0-9]+)(?:$|\?)/i);
  return m ? m[1].toUpperCase() : "VST3";
}

// ─── Navigation ───────────────────────────────────────────────────────────────
type ViewKind = "constellation" | "prods-artists" | "prods-detail" | "vst";
interface NavState { kind: ViewKind; artistId?: string; artistName?: string; }

// ─── Constellation canvas (overlay on the site's existing asciiBg) ───────────────
// Draws proper constellation shapes (28-40 stars, ≤2 connections each)
// on top of the fixed dot-cloud background — different pattern every visit.
interface CStar {
  x: number; y: number; vx: number; vy: number;
  r: number; baseOp: number; phase: number; phaseSpd: number;
}

function ConstellationCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let stars: CStar[] = [];
    let W = 0, H = 0, raf = 0;
    const conns = new Uint8Array(50);

    const initStars = (w: number, h: number) => {
      const COUNT = 28 + Math.floor(Math.random() * 12); // 28-39 per visit
      stars = Array.from({ length: COUNT }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.10,
        vy: (Math.random() - 0.5) * 0.10,
        r: 1.4 + Math.random() * 2.2,   // visibly larger than the bg grid dots
        baseOp: 0.45 + Math.random() * 0.45,
        phase: Math.random() * Math.PI * 2,
        phaseSpd: 0.005 + Math.random() * 0.013,
      }));
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      W = rect.width  || canvas.offsetWidth  || 800;
      H = rect.height || canvas.offsetHeight || 600;
      canvas.width  = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      initStars(W, H);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const draw = () => {
      ctx.clearRect(0, 0, W, H);

      // Wider radius → fewer, more spread-out constellation arms
      const maxD = Math.max(150, Math.min(W, H) * 0.30);

      for (const s of stars) {
        s.x += s.vx; s.y += s.vy; s.phase += s.phaseSpd;
        if (s.x <= 0 || s.x >= W) { s.vx *= -1; s.x = Math.max(0, Math.min(W, s.x)); }
        if (s.y <= 0 || s.y >= H) { s.vy *= -1; s.y = Math.max(0, Math.min(H, s.y)); }
      }

      // Nearest-neighbour lines — max 2 connections per star produces
      // clean branching shapes (like actual zodiac constellations, not a mesh)
      conns.fill(0);
      ctx.lineCap = "round";
      for (let i = 0; i < stars.length; i++) {
        if (conns[i] >= 2) continue;
        const cands: [number, number][] = [];
        for (let j = i + 1; j < stars.length; j++) {
          if (conns[j] >= 2) continue;
          const dx = stars[i].x - stars[j].x;
          const dy = stars[i].y - stars[j].y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < maxD) cands.push([d, j]);
        }
        cands.sort((a, b) => a[0] - b[0]);
        const take = Math.min(cands.length, 2 - conns[i]);
        for (let k = 0; k < take; k++) {
          const [d, j] = cands[k];
          if (conns[j] >= 2) continue;
          conns[i]++; conns[j]++;
          ctx.beginPath();
          ctx.moveTo(stars[i].x, stars[i].y);
          ctx.lineTo(stars[j].x, stars[j].y);
          ctx.strokeStyle = `rgba(255,255,255,${(1 - d / maxD) * 0.30})`;
          ctx.lineWidth = 0.7;
          ctx.stroke();
        }
      }

      // Stars — larger glow so they stand out above the background dot cloud
      for (const s of stars) {
        const tw = 0.72 + 0.28 * Math.sin(s.phase);
        const op = s.baseOp * tw;
        const grd = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 5.5);
        grd.addColorStop(0, `rgba(255,255,255,${op * 0.6})`);
        grd.addColorStop(1, "rgba(255,255,255,0)");
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r * 5.5, 0, Math.PI * 2);
        ctx.fillStyle = grd; ctx.fill();
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${op})`; ctx.fill();
      }

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, []);

  return <canvas ref={ref} className={styles.constellationBg} aria-hidden="true" />;
}

// ─── Constellation data ────────────────────────────────────────────────────────────────
const SVG_W = 1000, SVG_H = 560;

/** The 3 interactive entry-point stars of the constellation */
const CAT_NODES = [
  { id: "prods", x: 220, y: 210, label: "PRODS", sub: "PRODUCTIONS",   locked: false },
  { id: "vst",   x: 762, y: 168, label: "VST",   sub: "PLUGINS AUDIO", locked: false },
  { id: "merch", x: 490, y: 445, label: "MERCH", sub: "BIENTÔT",       locked: true  },
] as const;

type CatId = (typeof CAT_NODES)[number]["id"];

/** Relay stars along the constellation lines (non-interactive) */
const RELAY_STARS = [
  { id: "r1", x: 488, y: 118 },  // top-center, on PRODS–VST path
  { id: "r2", x: 318, y: 338 },  // left, on PRODS–MERCH path
  { id: "r3", x: 648, y: 320 },  // right, on VST–MERCH path
];

/** Isolated background sparkles around the constellation (non-interactive) */
const SPARKLE_STARS = [
  { id: "t1", x: 130, y: 158, r: 1.3 },
  { id: "t2", x: 872, y: 272, r: 1.2 },
  { id: "t3", x: 162, y: 428, r: 1.0 },
  { id: "t4", x: 848, y: 438, r: 1.1 },
  { id: "t5", x: 490, y: 520, r: 0.9 },
  { id: "t6", x:  52, y: 315, r: 0.8 },
  { id: "t7", x: 940, y: 360, r: 0.8 },
];

/** Lines that form the constellation shape */
const CONST_LINES: [string, string][] = [
  ["prods", "r1"], ["r1", "vst"],    // top arch PRODS–VST
  ["prods", "r2"], ["r2", "merch"],  // left branch PRODS–MERCH
  ["vst",   "r3"], ["r3", "merch"],  // right branch VST–MERCH
];

function getConstPos(id: string): { x: number; y: number } {
  return (CAT_NODES.find(n => n.id === id) as { x: number; y: number } | undefined)
      ?? RELAY_STARS.find(s => s.id === id)
      ?? { x: 0, y: 0 };
}

// ─── Constellation view ────────────────────────────────────────────────────────────────
function ConstellationView({
  hasProds, hasVsts, onNavigate,
}: {
  hasProds: boolean;
  hasVsts: boolean;
  onNavigate: (id: CatId) => void;
}) {
  const [hovered, setHovered] = useState<string | null>(null);
  const isAvail = (id: string) => (id === "prods" && hasProds) || (id === "vst" && hasVsts);

  return (
    <div className={styles.constellation}>
      <div className={styles.constellationHeader}>
        <h2 className={styles.title}>BOUTIQUE</h2>
        <p className={styles.subtitle}>
          Choisir une section<span className={styles.cursor}>_</span>
        </p>
      </div>

      <div className={styles.svgWrap}>
        <svg
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          className={styles.svg}
          aria-label="Navigation boutique — carte des sections"
        >
          <defs>
            <filter id="glow-cat" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="9" result="blur" />
              <feColorMatrix type="matrix"
                values="0 0 0 0 0   0 1 0 0 0.41   0 0 0 0 0.41   0 0 0 0.9 0"
                in="blur" result="colored" />
              <feMerge><feMergeNode in="colored" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="glow-locked-f" x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="glow-relay" x="-120%" y="-120%" width="340%" height="340%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          {/* — Constellation lines (drawn below everything) — */}
          {CONST_LINES.map(([a, b], i) => {
            const p1 = getConstPos(a), p2 = getConstPos(b);
            return (
              <line key={i}
                x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
                className={styles.constLine}
              />
            );
          })}

          {/* — Isolated sparkle stars (pure decoration) — */}
          {SPARKLE_STARS.map((s, i) => (
            <circle key={s.id} cx={s.x} cy={s.y} r={s.r}
              fill="white"
              className={styles.sparkleStar}
              style={{ animationDelay: `${i * 0.65}s` }}
            />
          ))}

          {/* — Relay stars along the lines — */}
          {RELAY_STARS.map((s, i) => (
            <circle key={s.id} cx={s.x} cy={s.y} r={2.8}
              fill="white"
              className={styles.relayStar}
              style={{ animationDelay: `${i * 1.1}s` }}
              filter="url(#glow-relay)"
            />
          ))}

          {/* — Category nodes (the main stars of the constellation) — */}
          {CAT_NODES.map(node => {
            const isHov = hovered === node.id;
            return (
              <g
                key={node.id}
                className={[
                  styles.catNode,
                  node.locked ? styles.catNodeLocked : "",
                  isHov       ? styles.catNodeHovered : "",
                ].join(" ")}
                onMouseEnter={() => !node.locked && setHovered(node.id)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => !node.locked && onNavigate(node.id)}
                role={node.locked ? undefined : "button"}
                tabIndex={node.locked ? -1 : 0}
                aria-label={node.locked ? `${node.label} — ${node.sub}` : `Accéder à ${node.label}`}
                onKeyDown={e => {
                  if (!node.locked && (e.key === "Enter" || e.key === " ")) onNavigate(node.id);
                }}
              >
                {/* Outer pulse ring */}
                {!node.locked && (
                  <circle cx={node.x} cy={node.y} r={26}
                    className={isHov ? styles.ringOuterHov : styles.ringOuter} />
                )}
                {/* Inner halo */}
                <circle cx={node.x} cy={node.y} r={15}
                  className={node.locked ? styles.ringLockedInner : (isHov ? styles.ringInnerHov : styles.ringInner)} />
                {/* Cross spikes */}
                {!node.locked && (<>
                  <line x1={node.x - 20} y1={node.y} x2={node.x + 20} y2={node.y}
                    className={isHov ? styles.spikeHov : styles.spike} />
                  <line x1={node.x} y1={node.y - 20} x2={node.x} y2={node.y + 20}
                    className={isHov ? styles.spikeHov : styles.spike} />
                </>)}
                {/* Core dot */}
                <circle cx={node.x} cy={node.y} r={6}
                  className={node.locked ? styles.starLocked : styles.star}
                  filter={node.locked ? "url(#glow-locked-f)" : "url(#glow-cat)"} />
                {/* Labels */}
                <text x={node.x} y={node.y + 36} textAnchor="middle"
                  className={node.locked ? styles.labelLocked : (isHov ? styles.labelHov : styles.labelCat)}
                >{node.label}</text>
                <text x={node.x} y={node.y + 52} textAnchor="middle"
                  className={styles.labelSub}
                >{node.sub}</text>
                {/* Hover hint */}
                {isHov && isAvail(node.id) && (
                  <text x={node.x} y={node.y - 34} textAnchor="middle"
                    className={styles.hintText}
                  >ENTRER →</text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

// ─── Back button (shared) ─────────────────────────────────────────────────────
function BackBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" className={styles.backBtn} onClick={onClick}>
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
        <path d="M8.5 2L3.5 7L8.5 12" stroke="currentColor" strokeWidth="1.5"
          strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {label}
    </button>
  );
}

// ─── Prods — artist list view ─────────────────────────────────────────────────
function ProdsArtistsView({
  artists, onBack, onSelect,
}: {
  artists: ArtistEntry[];
  onBack: () => void;
  onSelect: (a: ArtistEntry) => void;
}) {
  return (
    <div className={styles.subView}>
      <div className={styles.subViewHeader}>
        <BackBtn label="BOUTIQUE" onClick={onBack} />
        <div className={styles.subViewTitle}>
          <h2 className={styles.title}>PRODS</h2>
          <span className={styles.subtitle}>Sélectionner un producteur</span>
        </div>
      </div>

      <div className={styles.artistsScrollArea}>
        <div className={styles.artistsGrid}>
          {artists.map(a => (
            <button
              key={a.id}
              type="button"
              className={styles.artistCard}
              onClick={() => onSelect(a)}
              aria-label={`Voir les prods de ${a.name}`}
            >
              <div className={styles.artistCardMedia}>
                {a.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={a.image} alt={a.name} className={styles.artistImg} />
                ) : (
                  <div className={styles.artistImgPlaceholder}>
                    <span>{a.name.charAt(0).toUpperCase()}</span>
                  </div>
                )}
                <div className={styles.artistCardOverlay} />
                <span className={styles.artistProdBadge}>
                  {a.prodCount} prod{a.prodCount > 1 ? "s" : ""}
                </span>
              </div>
              <div className={styles.artistCardBody}>
                <span className={styles.artistName}>{a.name}</span>
                <span className={styles.artistArrow}>→</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Prods — individual artist prods ─────────────────────────────────────────
function ProdsDetailView({
  products, artistName, onBack,
}: {
  products: CatalogProduct[];
  artistName: string;
  onBack: () => void;
}) {
  return (
    <div className={styles.subView}>
      <div className={styles.subViewHeader}>
        <BackBtn label="ARTISTES" onClick={onBack} />
        <div className={styles.subViewTitle}>
          <h2 className={styles.title}>{artistName}</h2>
          <span className={styles.subtitle}>
            <b className={styles.accentCount}>{String(products.length).padStart(2, "0")}</b>
            &nbsp;production{products.length > 1 ? "s" : ""}
          </span>
        </div>
      </div>

      <div className={styles.prodsScrollArea}>
        <div className={styles.prodsGrid}>
          {products.map(p => {
            const min = p.tiers.length ? Math.min(...p.tiers.map(t => t.price_cents)) : 0;
            const specs: string[] = [];
            if (p.bpm) specs.push(`${p.bpm} BPM`);
            if (p.music_key) specs.push(p.music_key);
            return (
              <a key={p.id} href={`/shop/${p.id}`} className={styles.prodCard}>
                <div className={styles.prodCoverWrap}>
                  {p.cover_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.cover_url} alt={p.title} className={styles.prodCover} />
                  ) : (
                    <div className={styles.prodCoverPlaceholder}>
                      <i className="fas fa-music" aria-hidden="true" />
                    </div>
                  )}
                  <span className={styles.prodFormatTag}>MP3 / WAV</span>
                  {p.tiers.length > 0 && (
                    <span className={styles.prodPriceTag}>dès {euros(min)}</span>
                  )}
                </div>
                <div className={styles.prodBody}>
                  <h3 className={styles.prodName}>{p.title}</h3>
                  {specs.length > 0 && (
                    <div className={styles.prodSpecs}>
                      {specs.map((s, i) => (
                        <span key={s}>
                          {i > 0 && <span className={styles.prodSpecDot} />}
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </a>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── VST view ─────────────────────────────────────────────────────────────────
function VstView({
  vsts, search, sort, onSearch, onSort, onBack,
}: {
  vsts: Vst[];
  search: string;
  sort: "recent" | "name";
  onSearch: (s: string) => void;
  onSort: (s: "recent" | "name") => void;
  onBack: () => void;
}) {
  return (
    <div className={styles.subView}>
      <div className={styles.subViewHeader}>
        <BackBtn label="BOUTIQUE" onClick={onBack} />
        <div className={styles.subViewTitle}>
          <h2 className={styles.title}>VST</h2>
          <span className={styles.subtitle}>Plugins audio — téléchargement libre</span>
        </div>
      </div>

      <div className={styles.vstConsole}>
        <span className={styles.vstCount}>
          <b className={styles.accentCount}>{String(vsts.length).padStart(2, "0")}</b>
          <span className={styles.vstCountLabel}>plugin{vsts.length > 1 ? "s" : ""}</span>
        </span>
        <div className={styles.vstSearch}>
          <i className="fas fa-search" aria-hidden="true" />
          <input
            type="text"
            placeholder="Rechercher…"
            value={search}
            onChange={e => onSearch(e.target.value)}
            className={styles.vstSearchInput}
          />
          {search && (
            <button type="button" className={styles.vstClear} onClick={() => onSearch("")} aria-label="Effacer">
              <i className="fas fa-times" />
            </button>
          )}
        </div>
        <div className={styles.vstSortBtns}>
          <button type="button"
            className={`${styles.sortBtn} ${sort === "recent" ? styles.sortActive : ""}`}
            onClick={() => onSort("recent")}
          >Récents</button>
          <button type="button"
            className={`${styles.sortBtn} ${sort === "name" ? styles.sortActive : ""}`}
            onClick={() => onSort("name")}
          >A → Z</button>
        </div>
      </div>

      <div className={styles.vstScrollArea}>
        {vsts.length === 0 ? (
          <p className={styles.emptyMsg}>Aucun plugin trouvé.</p>
        ) : (
          <div className={styles.vstGrid}>
            {vsts.map((vst, i) => (
              <VstCard key={vst.id} vst={vst} index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── VST card ─────────────────────────────────────────────────────────────────
function VstCard({ vst, index }: { vst: Vst; index: number }) {
  const type   = vstType(vst);
  const format = vstFmt(vst);
  const num    = String(index + 1).padStart(2, "0");
  const canDl  = Boolean(vst.downloadUrl);
  const dateStr = (() => {
    try {
      const d = new Date(vst.releaseDate);
      const s = d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
      return s.charAt(0).toUpperCase() + s.slice(1);
    } catch { return vst.releaseDate; }
  })();

  return (
    <article className={styles.vstCard}>
      <div className={styles.vstMedia}>
        {vst.screenshots.length > 0 ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={vst.screenshots[0]}
            alt={vst.name}
            className={styles.vstShot}
            style={{ objectPosition: vst.screenshotPositions?.[0] ?? "50% 50%" }}
          />
        ) : (
          <div className={styles.vstMediaEmpty}><i className="fas fa-plug" /></div>
        )}
        <span className={styles.vstFmtBadge}>{format}</span>
        <span className={styles.vstNum}>{num}</span>
      </div>
      <div className={styles.vstBody}>
        <div className={styles.vstHead}>
          <span className={styles.vstType}>{type}</span>
          <span className={styles.vstRule} />
        </div>
        <h3 className={styles.vstName}>{vst.name}</h3>
        <p className={styles.vstDesc}>{vst.description}</p>
        <div className={styles.vstFoot}>
          <div className={styles.vstMeta}>
            {vst.version && <span className={styles.vstMetaItem}>v{vst.version}</span>}
            {vst.version && <span className={styles.vstSep} />}
            <span className={styles.vstMetaItem}>{dateStr}</span>
          </div>
          {canDl ? (
            <a
              href={vst.downloadUrl}
              className={styles.vstDl}
              download={vst.downloadUrl.startsWith("/uploads/") ? (vst.downloadFilename ?? true) : undefined}
              target={vst.downloadUrl.startsWith("/uploads/") ? undefined : "_blank"}
              rel="noreferrer"
            >
              Télécharger <i className="fas fa-arrow-down-long" />
            </a>
          ) : (
            <span className={`${styles.vstDl} ${styles.vstDlLocked}`}>
              Bientôt <i className="fas fa-lock" />
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

// ─── Main BoutiqueSection ─────────────────────────────────────────────────────
const TRANS_MS = 320;

export default function BoutiqueSection() {
  const [products,        setProducts]       = useState<CatalogProduct[]>([]);
  const [vsts,            setVsts]           = useState<Vst[]>([]);
  const [artistProfiles,  setArtistProfiles] = useState<ArtistProfile[]>([]);
  const [loadedProds,     setLoadedProds]    = useState(false);
  const [loadedVsts,      setLoadedVsts]     = useState(false);

  const [view,     setView]     = useState<NavState>({ kind: "constellation" });
  const [phase,    setPhase]    = useState<"idle" | "leaving" | "entering">("idle");

  const [vstSearch, setVstSearch] = useState("");
  const [vstSort,   setVstSort]   = useState<"recent" | "name">("recent");

  useEffect(() => {
    fetch("/api/shop/catalog")
      .then(r => r.json())
      .then(d => { if (d.status === "success") setProducts(d.data); })
      .catch(() => {})
      .finally(() => setLoadedProds(true));

    fetch("/api/artists/profiles")
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setArtistProfiles(d); })
      .catch(() => {});

    fetch("/api/vsts")
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setVsts(d); })
      .catch(() => {})
      .finally(() => setLoadedVsts(true));
  }, []);

  const artistEntries = useMemo<ArtistEntry[]>(() => {
    const map = new Map<string, ArtistEntry>();
    for (const p of products) {
      const ex = map.get(p.artist_id);
      if (ex) { ex.prodCount++; }
      else {
        const prof = artistProfiles.find(a => a.id === p.artist_id);
        map.set(p.artist_id, {
          id: p.artist_id, name: p.artist_name,
          image: prof?.image, prodCount: 1,
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, "fr"));
  }, [products, artistProfiles]);

  const filteredVsts = useMemo(() => {
    let list = [...vsts];
    if (vstSearch) {
      const q = vstSearch.toLowerCase();
      list = list.filter(v =>
        v.name.toLowerCase().includes(q) || v.description.toLowerCase().includes(q)
      );
    }
    if (vstSort === "name") list.sort((a, b) => a.name.localeCompare(b.name));
    else list.sort((a, b) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime());
    return list;
  }, [vsts, vstSearch, vstSort]);

  const navigate = useCallback((next: NavState) => {
    setPhase("leaving");
    setTimeout(() => {
      setView(next);
      setPhase("entering");
      setTimeout(() => setPhase("idle"), TRANS_MS);
    }, TRANS_MS);
  }, []);

  // Don't render if nothing to show
  if (loadedProds && loadedVsts && products.length === 0 && vsts.length === 0) return null;

  const wrapCls = [
    styles.viewWrap,
    phase === "leaving"  ? styles.phaseLeave  : "",
    phase === "entering" ? styles.phaseEnter  : "",
  ].filter(Boolean).join(" ");

  return (
    <section id="boutique" className={`screen ${styles.section}`}>
      {/* Constellation overlay above the site's fixed asciiBg dot-cloud */}
      <ConstellationCanvas />
      <div className={wrapCls} style={{ position: "relative", zIndex: 1 }}>
        {view.kind === "constellation" && (
          <ConstellationView
            hasProds={products.length > 0}
            hasVsts={vsts.length > 0}
            onNavigate={id => {
              if (id === "prods") navigate({ kind: "prods-artists" });
              else if (id === "vst") navigate({ kind: "vst" });
            }}
          />
        )}
        {view.kind === "prods-artists" && (
          <ProdsArtistsView
            artists={artistEntries}
            onBack={() => navigate({ kind: "constellation" })}
            onSelect={a => navigate({ kind: "prods-detail", artistId: a.id, artistName: a.name })}
          />
        )}
        {view.kind === "prods-detail" && (
          <ProdsDetailView
            products={products.filter(p => p.artist_id === view.artistId)}
            artistName={view.artistName ?? ""}
            onBack={() => navigate({ kind: "prods-artists" })}
          />
        )}
        {view.kind === "vst" && (
          <VstView
            vsts={filteredVsts}
            search={vstSearch}
            sort={vstSort}
            onSearch={setVstSearch}
            onSort={setVstSort}
            onBack={() => navigate({ kind: "constellation" })}
          />
        )}
      </div>
    </section>
  );
}
