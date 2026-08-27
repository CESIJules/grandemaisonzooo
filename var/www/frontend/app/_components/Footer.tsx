import Link from "next/link";
import styles from "./Footer.module.css";

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.brandCol}>
          <span className={styles.brand}>GRANDE MAISON ZOO</span>
          <p className={styles.tagline}>
            Collectif artistique indépendant — radio en direct 24/7 et boutique de prods.
          </p>
          <div className={styles.socials}>
            <a href="https://www.instagram.com/grandemaisonzoo/" target="_blank" rel="noreferrer" aria-label="Instagram">
              <i className="fab fa-instagram" />
            </a>
            <a href="https://discord.gg/H8hVEuksXA" target="_blank" rel="noreferrer" aria-label="Discord">
              <i className="fab fa-discord" />
            </a>
            <a href="https://www.youtube.com/@GRANDEMAISONzoo" target="_blank" rel="noreferrer" aria-label="YouTube">
              <i className="fab fa-youtube" />
            </a>
            <a href="https://www.twitch.tv/grandemaison" target="_blank" rel="noreferrer" aria-label="Twitch">
              <i className="fab fa-twitch" />
            </a>
          </div>
        </div>

        <div className={styles.linkCol}>
          <span className={styles.colTitle}>Site</span>
          <Link href="/#accueil">Accueil</Link>
          <Link href="/#nelsonnorth">Artistes</Link>
          <Link href="/#radio">Radio</Link>
          <Link href="/#boutique">Boutique</Link>
          <Link href="/#vst">VST</Link>
          <Link href="/#contact">Contact</Link>
        </div>

        <div className={styles.linkCol}>
          <span className={styles.colTitle}>Légal</span>
          <Link href="/legal/mentions-legales">Mentions légales</Link>
          <Link href="/legal/cgv">CGV</Link>
          <Link href="/legal/confidentialite">Confidentialité</Link>
          <Link href="/legal/remboursement">Remboursement</Link>
        </div>

        <div className={styles.linkCol}>
          <span className={styles.colTitle}>Contact</span>
          <a href="mailto:contact@grandemaisonzoo.com">contact@grandemaisonzoo.com</a>
          <span className={styles.muted}>9 Rue d&apos;Isoard</span>
          <span className={styles.muted}>13001 Marseille</span>
          <span className={styles.muted}>France</span>
        </div>
      </div>

      <div className={styles.bottom}>
        <span>© {new Date().getFullYear()} GRANDE MAISON ZOO — Tous droits réservés</span>
        <span className={styles.paymentRow}>
          Paiements sécurisés via <strong>Stripe</strong>
          <i className="fab fa-cc-visa" />
          <i className="fab fa-cc-mastercard" />
          <i className="fab fa-cc-amex" />
        </span>
      </div>
    </footer>
  );
}
