import type { ArtistProfile } from "@/types";
import styles from "./ArtistCard.module.css";

interface Props {
  profile: ArtistProfile;
}

export default function ArtistCard({ profile }: Props) {
  const { name, glitchName, location, image, listenLink, watchLink, instagramLink } = profile;

  return (
    <article className={styles.card}>
      <div className={styles.imageWrap}>
        {image ? (
          <img
            src={image.startsWith("/") ? image : `/uploads/artists/${image}`}
            alt={name}
            className={styles.image}
            loading="lazy"
          />
        ) : (
          <div className={styles.imagePlaceholder}>
            <i className="fas fa-user" />
          </div>
        )}
      </div>

      <div className={styles.content}>
        <h3
          className={styles.name}
          data-glitch={glitchName ?? name}
        >
          {name}
        </h3>
        {location && <p className={styles.location}>{location}</p>}

        <div className={styles.links}>
          {listenLink && (
            <a
              href={listenLink}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.link}
              aria-label={`Ecouter ${name}`}
            >
              <i className="fas fa-headphones" />
            </a>
          )}
          {watchLink && (
            <a
              href={watchLink}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.link}
              aria-label={`Voir ${name}`}
            >
              <i className="fab fa-youtube" />
            </a>
          )}
          {instagramLink && (
            <a
              href={instagramLink}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.link}
              aria-label={`Instagram ${name}`}
            >
              <i className="fab fa-instagram" />
            </a>
          )}
        </div>
      </div>
    </article>
  );
}
