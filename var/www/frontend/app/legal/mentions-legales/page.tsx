import type { Metadata } from "next";
import Link from "next/link";
import styles from "../legal.module.css";

export const metadata: Metadata = {
  title: "Mentions légales",
  description: "Informations légales relatives au site GRANDEMAISONZOO.COM",
};

export default function MentionsLegalesPage() {
  return (
    <main className={styles.page}>
      <div className={styles.inner}>
        <a href="/" className={styles.back}>
          <i className="fas fa-arrow-left" /> Retour à l&apos;accueil
        </a>

        <p className={styles.kicker}>Informations légales</p>
        <h1 className={styles.title}>Mentions légales</h1>
        <p className={styles.lead}>
          Conformément aux dispositions de la loi n° 2004-575 du 21 juin 2004 pour la confiance dans
          l&apos;économie numérique, voici les informations légales du site grandemaisonzoo.com.
        </p>
        <span className={styles.updated}>Dernière mise à jour : 27 juin 2026</span>

        <section className={styles.section}>
          <h2><span className={styles.num}>01</span> Éditeur du site</h2>
          <dl className={styles.defs}>
            <dt>Dénomination</dt>
            <dd>GRANDE MAISON ZOO — collectif artistique indépendant</dd>
            <dt>Adresse</dt>
            <dd>9 Rue d&apos;Isoard, 13001 Marseille, France</dd>
            <dt>Email</dt>
            <dd><a href="mailto:contact@grandemaisonzoo.com">contact@grandemaisonzoo.com</a></dd>
            <dt>Directeur de la publication</dt>
            <dd>Le représentant légal du collectif GRANDE MAISON ZOO</dd>
          </dl>
        </section>

        <section className={styles.section}>
          <h2><span className={styles.num}>02</span> Hébergement</h2>
          <p>
            Le site est hébergé par <strong>IONOS SARL</strong>, 7 place de la Gare, BP 70109,
            57201 Sarreguemines Cedex, France.
          </p>
          <p>
            Téléphone : 0970 808 911 — Site : <a href="https://www.ionos.fr" target="_blank" rel="noopener noreferrer">www.ionos.fr</a>
          </p>
        </section>

        <section className={styles.section}>
          <h2><span className={styles.num}>03</span> Paiements</h2>
          <p>
            Les paiements en ligne effectués sur la plateforme sont traités par{" "}
            <strong>Stripe Payments Europe Ltd</strong>, The One Building, 1 Lower Grand Canal Street,
            Dublin 2, Irlande — fournisseur de services de paiement agréé.
          </p>
          <div className={styles.callout}>
            <p>
              GRANDEMAISONZOO utilise <strong>Stripe Connect</strong> en mode direct charges : lors
              d&apos;une vente, le paiement est encaissé directement par l&apos;artiste vendeur, et une
              commission plateforme automatique est prélevée au profit de GRANDE MAISON ZOO.
            </p>
          </div>
        </section>

        <section className={styles.section}>
          <h2><span className={styles.num}>04</span> Propriété intellectuelle</h2>
          <p>
            L&apos;ensemble des contenus présents sur le site (textes, images, sons, vidéos, prods
            musicales, code) est protégé par le droit de la propriété intellectuelle. Sauf mention
            contraire, ces contenus sont la propriété de GRANDE MAISON ZOO, de ses artistes ou de
            leurs ayants-droit.
          </p>
          <p>
            Toute reproduction, représentation, modification, publication, adaptation ou exploitation
            totale ou partielle, par quelque procédé que ce soit, sans autorisation écrite préalable,
            est interdite et constitue une contrefaçon (articles L.335-2 et suivants du Code de la
            propriété intellectuelle).
          </p>
          <p>
            Les prods musicales achetées sur la boutique restent la propriété de leur auteur. L&apos;achat
            confère à l&apos;acheteur une licence d&apos;utilisation dont les termes sont précisés au moment
            de la vente (voir les <Link href="/legal/cgv">conditions générales de vente</Link>).
          </p>
        </section>

        <section className={styles.section}>
          <h2><span className={styles.num}>05</span> Données personnelles</h2>
          <p>
            Le traitement des données personnelles fait l&apos;objet d&apos;une{" "}
            <Link href="/legal/confidentialite">politique de confidentialité dédiée</Link>{" "}
            consultable séparément.
          </p>
        </section>

        <section className={styles.section}>
          <h2><span className={styles.num}>06</span> Cookies</h2>
          <p>
            Le site utilise des cookies strictement nécessaires à son fonctionnement (session
            utilisateur, panier d&apos;achat). Aucun cookie publicitaire ou de pistage tiers n&apos;est déposé
            sans consentement. Voir la <Link href="/legal/confidentialite">politique de confidentialité</Link>.
          </p>
        </section>

        <section className={styles.section}>
          <h2><span className={styles.num}>07</span> Contact</h2>
          <p>
            Pour toute question relative au fonctionnement du site, aux ventes, à la radio ou aux
            artistes, écris-nous à{" "}
            <a href="mailto:contact@grandemaisonzoo.com">contact@grandemaisonzoo.com</a>.
          </p>
        </section>
      </div>
    </main>
  );
}
