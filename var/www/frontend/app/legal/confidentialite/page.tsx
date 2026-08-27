import type { Metadata } from "next";
import Link from "next/link";
import styles from "../legal.module.css";

export const metadata: Metadata = {
  title: "Politique de confidentialité",
  description: "Traitement des données personnelles sur GRANDEMAISONZOO.COM — conforme RGPD.",
};

export default function ConfidentialitePage() {
  return (
    <main className={styles.page}>
      <div className={styles.inner}>
        <a href="/" className={styles.back}>
          <i className="fas fa-arrow-left" /> Retour à l&apos;accueil
        </a>

        <p className={styles.kicker}>RGPD — Données personnelles</p>
        <h1 className={styles.title}>Politique de confidentialité</h1>
        <p className={styles.lead}>
          Cette politique décrit comment GRANDE MAISON ZOO collecte, utilise et protège les données
          personnelles des visiteurs, acheteurs et artistes du site grandemaisonzoo.com, conformément
          au Règlement Général sur la Protection des Données (RGPD) et à la loi Informatique et
          Libertés.
        </p>
        <span className={styles.updated}>Dernière mise à jour : 27 juin 2026</span>

        <section className={styles.section}>
          <h2><span className={styles.num}>01</span> Responsable du traitement</h2>
          <p>
            Le responsable du traitement des données est <strong>GRANDE MAISON ZOO</strong>, dont
            les coordonnées figurent dans les <Link href="/legal/mentions-legales">mentions légales</Link>.
          </p>
          <p>
            Contact pour toute demande relative aux données personnelles :{" "}
            <a href="mailto:contact@grandemaisonzoo.com">contact@grandemaisonzoo.com</a>.
          </p>
        </section>

        <section className={styles.section}>
          <h2><span className={styles.num}>02</span> Données collectées</h2>
          <h3>Visiteurs</h3>
          <ul>
            <li>Adresse IP, données de connexion (logs techniques)</li>
            <li>Type de navigateur et appareil</li>
          </ul>
          <h3>Acheteurs de prods</h3>
          <ul>
            <li>Adresse email (obligatoire pour la livraison numérique)</li>
            <li>Nom, prénom (si fournis lors du paiement)</li>
            <li>Informations de paiement : <strong>traitées exclusivement par Stripe</strong>, jamais stockées sur nos serveurs</li>
            <li>Pays / devise détectés automatiquement</li>
          </ul>
          <h3>Artistes inscrits</h3>
          <ul>
            <li>Email professionnel, nom d&apos;artiste</li>
            <li>Mot de passe (stocké de manière irréversible — bcrypt)</li>
            <li>Coordonnées bancaires et informations KYC : <strong>collectées et stockées par Stripe Connect</strong>, jamais par notre serveur</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2><span className={styles.num}>03</span> Finalités et bases légales</h2>
          <dl className={styles.defs}>
            <dt>Exécution du contrat</dt>
            <dd>Traitement des commandes, livraison des fichiers numériques, gestion du compte artiste. Base : article 6.1.b RGPD (exécution d&apos;un contrat).</dd>
            <dt>Obligations légales</dt>
            <dd>Conservation de preuves d&apos;achat, facturation, lutte contre la fraude. Base : article 6.1.c RGPD.</dd>
            <dt>Intérêt légitime</dt>
            <dd>Sécurité du site, prévention des abus, analyse technique anonymisée. Base : article 6.1.f RGPD.</dd>
            <dt>Consentement</dt>
            <dd>Aucun envoi marketing par email sans accord explicite. Base : article 6.1.a RGPD.</dd>
          </dl>
        </section>

        <section className={styles.section}>
          <h2><span className={styles.num}>04</span> Destinataires des données</h2>
          <p>
            Tes données ne sont jamais vendues. Elles sont partagées uniquement avec :
          </p>
          <ul>
            <li><strong>Stripe Payments Europe Ltd</strong> (Dublin, Irlande) — traitement des paiements et des comptes connectés. Voir leur <a href="https://stripe.com/fr/privacy" target="_blank" rel="noopener noreferrer">politique de confidentialité</a>.</li>
            <li><strong>IONOS SARL</strong> (Sarreguemines, France) — hébergement technique du site.</li>
            <li><strong>L&apos;artiste vendeur</strong> reçoit l&apos;email de l&apos;acheteur via le tableau de bord Stripe Connect, pour permettre un éventuel SAV.</li>
          </ul>
          <p>
            Aucun transfert de données hors Union Européenne n&apos;est effectué de notre fait. Stripe
            peut transférer certaines données vers les États-Unis dans le cadre du Data Privacy
            Framework UE-USA, sous garanties contractuelles standards (clauses contractuelles types
            de la Commission européenne).
          </p>
        </section>

        <section className={styles.section}>
          <h2><span className={styles.num}>05</span> Durées de conservation</h2>
          <ul>
            <li><strong>Données de commande</strong> (factures, historique) : 10 ans, obligation comptable</li>
            <li><strong>Compte artiste actif</strong> : conservées tant que le compte est actif, puis 3 ans après inactivité</li>
            <li><strong>Logs techniques</strong> : 12 mois maximum</li>
            <li><strong>Données Stripe</strong> : selon la politique de Stripe (généralement 7 à 10 ans pour les transactions)</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2><span className={styles.num}>06</span> Tes droits</h2>
          <p>
            Conformément au RGPD, tu disposes des droits suivants sur tes données personnelles :
          </p>
          <ul>
            <li><strong>Droit d&apos;accès</strong> : obtenir une copie de tes données</li>
            <li><strong>Droit de rectification</strong> : corriger des informations inexactes</li>
            <li><strong>Droit à l&apos;effacement</strong> (« droit à l&apos;oubli ») : sous réserve des obligations légales de conservation</li>
            <li><strong>Droit à la portabilité</strong> : récupérer tes données dans un format structuré</li>
            <li><strong>Droit d&apos;opposition</strong> : t&apos;opposer à un traitement fondé sur l&apos;intérêt légitime</li>
            <li><strong>Droit à la limitation</strong> du traitement</li>
            <li><strong>Droit de retirer ton consentement</strong> à tout moment</li>
          </ul>
          <p>
            Pour exercer ces droits, écris à{" "}
            <a href="mailto:contact@grandemaisonzoo.com">contact@grandemaisonzoo.com</a> en
            précisant l&apos;objet de ta demande. Une réponse te sera apportée sous un mois maximum.
          </p>
          <div className={styles.callout}>
            <p>
              Si tu estimes que tes droits ne sont pas respectés, tu peux introduire une réclamation
              auprès de la <strong>CNIL</strong> :{" "}
              <a href="https://www.cnil.fr/fr/plaintes" target="_blank" rel="noopener noreferrer">
                cnil.fr/fr/plaintes
              </a>.
            </p>
          </div>
        </section>

        <section className={styles.section}>
          <h2><span className={styles.num}>07</span> Cookies</h2>
          <p>
            Le site utilise uniquement des cookies <strong>strictement nécessaires</strong> à son
            fonctionnement :
          </p>
          <ul>
            <li><strong>Cookie de session</strong> (iron-session) : maintient la connexion d&apos;un artiste à son tableau de bord</li>
            <li><strong>Cookie panier</strong> : conserve la sélection en cours de commande</li>
          </ul>
          <p>
            <strong>Aucun cookie publicitaire, aucun tracker tiers</strong>, aucun outil d&apos;analyse
            externe (Google Analytics, Meta Pixel, etc.) n&apos;est déposé sur le site. Aucun
            consentement n&apos;est donc requis pour ces cookies fonctionnels (article 82 de la loi
            Informatique et Libertés modifiée).
          </p>
        </section>

        <section className={styles.section}>
          <h2><span className={styles.num}>08</span> Sécurité</h2>
          <p>
            Les données sont stockées sur des serveurs sécurisés en Union Européenne (IONOS, France).
            Le site est intégralement servi en HTTPS (chiffrement TLS). Les mots de passe sont stockés
            de manière irréversible (hash bcrypt). Les fichiers livrables sont protégés par des liens
            temporaires signés (72 h, 5 téléchargements max).
          </p>
        </section>

        <section className={styles.section}>
          <h2><span className={styles.num}>09</span> Modifications</h2>
          <p>
            Cette politique peut être amenée à évoluer. La date de dernière mise à jour est indiquée
            en haut de page. Toute modification substantielle sera communiquée aux artistes par email.
          </p>
        </section>
      </div>
    </main>
  );
}
