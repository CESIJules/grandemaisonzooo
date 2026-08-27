"use client";
import { useEffect, useMemo, useState } from "react";
import styles from "./ShopSection.module.css";

interface CatalogTier { price_cents: number; }
interface CatalogProduct {
  id: string;
  title: string;
  cover_url?: string;
  artist_name: string;
  bpm?: number;
  music_key?: string;
  tiers: CatalogTier[];
}

function euros(cents: number): string {
  return `${(cents / 100).toFixed(2)} €`;
}

export default function ShopSection() {
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [activeArtist, setActiveArtist] = useState<string>("Tous");

  useEffect(() => {
    fetch("/api/shop/catalog")
      .then((r) => r.json())
      .then((d) => { if (d.status === "success") setProducts(d.data); })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const artists = useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];
    for (const p of products) {
      if (!seen.has(p.artist_name)) {
        seen.add(p.artist_name);
        list.push(p.artist_name);
      }
    }
    return list.sort((a, b) => a.localeCompare(b, "fr", { sensitivity: "base" }));
  }, [products]);

  const filtered = useMemo(() => {
    if (activeArtist === "Tous") return products;
    return products.filter((p) => p.artist_name === activeArtist);
  }, [products, activeArtist]);

  // Hide the section entirely until there is something to show.
  if (loaded && products.length === 0) return null;

  return (
    <section id="boutique" className={`screen ${styles.section}`}>
      <div className={styles.header}>
        <h2 className={styles.title}>BOUTIQUE</h2>
        <p className={styles.subtitle}>Les prods du collectif, en téléchargement direct</p>
      </div>

      {artists.length > 1 && (
        <div className={styles.filters}>
          <button
            type="button"
            className={`${styles.filterBtn} ${activeArtist === "Tous" ? styles.filterBtnActive : ""}`}
            onClick={() => setActiveArtist("Tous")}
          >
            Tous
          </button>
          {artists.map((a) => (
            <button
              key={a}
              type="button"
              className={`${styles.filterBtn} ${activeArtist === a ? styles.filterBtnActive : ""}`}
              onClick={() => setActiveArtist(a)}
            >
              {a}
            </button>
          ))}
        </div>
      )}

      <div className={styles.console}>
        <span className={styles.count}>
          <b>{String(filtered.length).padStart(2, "0")}</b>
          <span>
            référence{filtered.length > 1 ? "s" : ""}
            {activeArtist !== "Tous" ? ` · ${activeArtist}` : " disponibles"}
          </span>
        </span>
        <span className={styles.spacer} />
      </div>

      <div className={styles.scrollArea}>
        <div className={styles.grid}>
          {filtered.map((p) => {
            const min = p.tiers.length ? Math.min(...p.tiers.map((t) => t.price_cents)) : 0;
            const specs: string[] = [];
            if (p.bpm) specs.push(`${p.bpm} BPM`);
            if (p.music_key) specs.push(p.music_key);
            return (
              <a key={p.id} href={`/shop/${p.id}`} className={styles.card}>
                <div className={styles.coverWrap}>
                  {p.cover_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.cover_url} alt={p.title} className={styles.cover} />
                  ) : (
                    <div className={styles.coverPlaceholder}>
                      <i className="fas fa-music" />
                    </div>
                  )}
                  <span className={styles.tag}>Prod · MP3 / WAV</span>
                  <span className={styles.priceTag}>dès {euros(min)}</span>
                </div>
                <div className={styles.body}>
                  <div className={styles.head}>
                    <span className={styles.kicker}>Beat</span>
                    <span className={styles.rule} />
                  </div>
                  <h3 className={styles.name}>{p.title}</h3>
                  <span className={styles.artist}>{p.artist_name}</span>
                  {specs.length > 0 && (
                    <div className={styles.specsLine}>
                      {specs.map((s, i) => (
                        <span key={s}>
                          {i > 0 && <span className={styles.dot} style={{ marginRight: "0.5rem" }} />}
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

        {loaded && filtered.length === 0 && (
          <p className={styles.empty}>Aucune prod pour cet artiste pour le moment.</p>
        )}
      </div>
    </section>
  );
}
