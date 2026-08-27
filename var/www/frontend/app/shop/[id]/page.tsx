import Link from "next/link";
import { notFound } from "next/navigation";
import { getProductWithTiers } from "@/lib/shop";
import { getArtistProfileById } from "@/lib/data";
import ProductPurchase from "../ProductPurchase";
import RelatedProducts from "../RelatedProducts";
import styles from "../shop.module.css";

export const dynamic = "force-dynamic";

function frenchDate(iso: string): string {
  try {
    const d = new Date(iso.replace(" ", "T"));
    return d.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = getProductWithTiers(id);
  if (!product || product.status !== "published") notFound();

  const artist = getArtistProfileById(product.artist_id);
  const purchasable = !!artist?.stripeChargesEnabled;
  const exclusiveExists = product.tiers.some((t) => t.is_exclusive);
  const minPriceCents = product.tiers.length
    ? Math.min(...product.tiers.map((t) => t.price_cents))
    : 0;

  // Auto-generated tags
  const tags: string[] = [];
  if (product.bpm) tags.push(`${product.bpm} BPM`);
  if (product.music_key) tags.push(`Key ${product.music_key}`);
  if (artist?.name) tags.push(artist.name);
  if (exclusiveExists) tags.push("Exclusive");

  return (
    <div className={styles.page}>
      <Link href="/#boutique" className={styles.back}>
        <i className="fas fa-arrow-left" /> Retour à la boutique
      </Link>

      <div className={styles.shell}>
        {/* ============ SIDEBAR ============ */}
        <aside className={styles.sidebar}>
          <div className={styles.coverBox}>
            {product.cover_url ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={product.cover_url} alt={product.title} className={styles.coverImg} />
            ) : (
              <div className={`${styles.coverImg} ${styles.coverPlaceholder}`}>
                <i className="fas fa-music" />
              </div>
            )}
            {product.preview_audio_url && (
              <span className={styles.coverBadge}>
                <i className="fas fa-headphones" /> Teaser
              </span>
            )}
          </div>

          <div className={styles.identity}>
            <h1 className={styles.identTitle}>{product.title}</h1>
            <p className={styles.identArtist}>
              <i className="fas fa-user-astronaut" /> {artist?.name ?? product.artist_id}
            </p>
          </div>

          {product.preview_audio_url && (
            <div className={styles.audioBox}>
              <audio
                controls
                className={styles.audio}
                src={product.preview_audio_url}
                preload="none"
              />
            </div>
          )}

          {product.description && (
            <div className={styles.aboutBlock}>
              <span className={styles.aboutKicker}>À propos</span>
              <p className={styles.aboutText}>{product.description}</p>
            </div>
          )}

          <div className={styles.infoBlock}>
            <span className={styles.infoKicker}>Informations</span>
            <dl className={styles.infoList}>
              <div className={styles.infoRow}>
                <dt>Publié</dt>
                <dd>{frenchDate(product.created_at)}</dd>
              </div>
              {product.bpm && (
                <div className={styles.infoRow}>
                  <dt>BPM</dt>
                  <dd>{product.bpm}</dd>
                </div>
              )}
              {product.music_key && (
                <div className={styles.infoRow}>
                  <dt>Tonalité</dt>
                  <dd>{product.music_key}</dd>
                </div>
              )}
              <div className={styles.infoRow}>
                <dt>Licences</dt>
                <dd>
                  {product.tiers.length} option{product.tiers.length > 1 ? "s" : ""}
                </dd>
              </div>
              <div className={styles.infoRow}>
                <dt>À partir de</dt>
                <dd className={styles.infoFrom}>{(minPriceCents / 100).toFixed(2)} €</dd>
              </div>
            </dl>
          </div>

          {tags.length > 0 && (
            <div className={styles.tagsBlock}>
              <span className={styles.tagsKicker}>Tags</span>
              <div className={styles.tagsRow}>
                {tags.map((t) => (
                  <span key={t} className={styles.tag}>
                    #{t.replace(/\s+/g, "")}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className={styles.legalBlock}>
            <i className="fas fa-shield-halved" />
            <span>
              Paiement sécurisé via Stripe. Téléchargement disponible immédiatement après l&apos;achat,
              lien valable 72&nbsp;h.
            </span>
          </div>
        </aside>

        {/* ============ MAIN ============ */}
        <main className={styles.main}>
          {!purchasable && (
            <div className={styles.notice}>
              <i className="fas fa-info-circle" />
              <span>
                Cette prod n&apos;est pas encore disponible à l&apos;achat — l&apos;artiste finalise la
                configuration de ses paiements.
              </span>
            </div>
          )}

          <ProductPurchase tiers={product.tiers} purchasable={purchasable} />

          <RelatedProducts
            artistId={product.artist_id}
            artistName={artist?.name ?? product.artist_id}
            excludeId={product.id}
          />
        </main>
      </div>
    </div>
  );
}
