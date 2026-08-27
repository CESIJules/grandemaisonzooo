"use client";
import { useEffect, useState } from "react";
import styles from "./shop.module.css";

interface CatalogTier { price_cents: number; }
interface CatalogProduct {
  id: string;
  title: string;
  cover_url?: string;
  artist_id: string;
  artist_name: string;
  tiers: CatalogTier[];
}

function euros(cents: number): string {
  return `${(cents / 100).toFixed(2)} €`;
}

export default function RelatedProducts({
  artistId,
  artistName,
  excludeId,
}: {
  artistId: string;
  artistName: string;
  excludeId: string;
}) {
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/shop/catalog")
      .then((r) => r.json())
      .then((d) => {
        if (d.status === "success" && Array.isArray(d.data)) {
          const same = (d.data as CatalogProduct[]).filter(
            (p) => p.artist_id === artistId && p.id !== excludeId
          );
          setProducts(same.slice(0, 8));
        }
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, [artistId, excludeId]);

  if (loaded && products.length === 0) return null;

  return (
    <section className={styles.related}>
      <div className={styles.relatedHeader}>
        <h2 className={styles.relatedTitle}>
          Plus de prods de <span className={styles.relatedArtist}>{artistName}</span>
        </h2>
      </div>

      <div className={styles.relatedRow}>
        {products.map((p) => {
          const min = p.tiers.length ? Math.min(...p.tiers.map((t) => t.price_cents)) : 0;
          return (
            <a key={p.id} href={`/shop/${p.id}`} className={styles.relatedCard}>
              <div className={styles.relatedCover}>
                {p.cover_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.cover_url} alt={p.title} />
                ) : (
                  <div className={styles.relatedCoverPlaceholder}>
                    <i className="fas fa-music" />
                  </div>
                )}
                <span className={styles.relatedPriceTag}>
                  <i className="fas fa-bag-shopping" /> dès {euros(min)}
                </span>
              </div>
              <div className={styles.relatedBody}>
                <span className={styles.relatedName}>{p.title}</span>
                <span className={styles.relatedSub}>{p.artist_name}</span>
              </div>
            </a>
          );
        })}
      </div>
    </section>
  );
}
