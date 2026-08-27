import type { Metadata } from "next";
import Link from "next/link";
import styles from "../legal.module.css";

export const metadata: Metadata = {
  title: "Conditions générales de vente",
  description: "CGV de la boutique GRANDEMAISONZOO — vente de productions musicales en ligne.",
};

export default function CgvPage() {
  return (
    <main className={styles.page}>
      <div className={styles.inner}>
        <a href="/" className={styles.back}>
          <i className="fas fa-arrow-left" /> Retour à l&apos;accueil
        </a>

        <p className={styles.kicker}>Boutique en ligne</p>
        <h1 className={styles.title}>Conditions générales de vente</h1>
        <p className={styles.lead}>
          Les présentes CGV régissent les ventes de productions musicales (« prods ») réalisées sur
          le site grandemaisonzoo.com entre les artistes du collectif et les acheteurs.
        </p>
        <span className={styles.updated}>Dernière mise à jour : 27 juin 2026</span>

        <section className={styles.section}>
          <h2><span className={styles.num}>01</span> Objet</h2>
          <p>
            Les présentes CGV ont pour objet de définir les droits et obligations des parties dans le
            cadre de la vente en ligne, par les artistes affiliés au collectif GRANDE MAISON ZOO, de
            productions musicales numériques téléchargeables.
          </p>
        </section>

        <section className={styles.section}>
          <h2><span className={styles.num}>02</span> Parties au contrat</h2>
          <p>
            La plateforme grandemaisonzoo.com est exploitée par <strong>GRANDE MAISON ZOO</strong>
            {" "}(ci-après « la plateforme »).
          </p>
          <p>
            Le vendeur d&apos;une prod est l&apos;<strong>artiste créateur</strong> de cette prod, identifié
            sur la fiche produit. L&apos;artiste perçoit directement le prix de vente, déduction faite
            d&apos;une commission plateforme.
          </p>
          <p>
            L&apos;acheteur est toute personne physique majeure ou personne morale procédant à un achat
            sur la plateforme.
          </p>
        </section>

        <section className={styles.section}>
          <h2><span className={styles.num}>03</span> Produits</h2>
          <p>
            Les produits proposés sont des <strong>fichiers numériques</strong> (audio MP3 / WAV,
            stems, kits multipistes) téléchargeables après paiement. Chaque produit est proposé selon
            un ou plusieurs <strong>paliers de licence</strong> (ex. MP3 Lease, WAV Lease, Stems,
            Unlimited Lease, Exclusive Rights), précisés sur la fiche produit.
          </p>
          <p>
            Les caractéristiques techniques (BPM, tonalité, formats inclus) et les droits associés à
            chaque palier sont décrits avant l&apos;achat.
          </p>
        </section>

        <section className={styles.section}>
          <h2><span className={styles.num}>04</span> Prix</h2>
          <p>
            Les prix sont affichés en euros, toutes taxes comprises (TTC). Ils sont librement fixés
            par chaque artiste vendeur. Le prix indiqué au moment de la commande est celui qui sera
            facturé à l&apos;acheteur.
          </p>
          <p>
            Le prix peut varier selon le palier de licence sélectionné. Les paliers exclusifs sont
            retirés de la vente après acquisition par un acheteur.
          </p>
        </section>

        <section className={styles.section}>
          <h2><span className={styles.num}>05</span> Commande et paiement</h2>
          <p>
            La commande est validée par le clic sur le bouton « Acheter » du palier sélectionné,
            puis par la finalisation du paiement sur la page de paiement sécurisée de Stripe.
          </p>
          <p>
            Les paiements sont traités par <strong>Stripe Payments Europe Ltd</strong>. La plateforme
            ne stocke à aucun moment les données de carte bancaire de l&apos;acheteur.
          </p>
          <div className={styles.callout}>
            <p>
              <strong>Stripe Connect — Direct Charges :</strong> le paiement est encaissé directement
              par l&apos;artiste vendeur sur son compte Stripe. Une commission plateforme de 10 %
              (susceptible d&apos;évoluer) est prélevée automatiquement au profit de GRANDE MAISON ZOO.
            </p>
          </div>
        </section>

        <section className={styles.section}>
          <h2><span className={styles.num}>06</span> Livraison numérique</h2>
          <p>
            Après confirmation du paiement (en général immédiatement), l&apos;acheteur reçoit par email
            un lien de téléchargement sécurisé donnant accès aux fichiers du palier acheté.
          </p>
          <p>
            Le lien est valable <strong>72 heures</strong> et autorise <strong>5 téléchargements
            maximum</strong>. Au-delà, ou en cas de perte du lien, l&apos;acheteur peut contacter{" "}
            <a href="mailto:contact@grandemaisonzoo.com">contact@grandemaisonzoo.com</a> pour
            obtenir un nouveau lien (sur justification d&apos;achat).
          </p>
        </section>

        <section className={styles.section}>
          <h2><span className={styles.num}>07</span> Droit de rétractation</h2>
          <div className={styles.warning}>
            <p>
              <strong>Important — Pas de droit de rétractation pour les produits numériques.</strong>{" "}
              Conformément à l&apos;article <strong>L221-28 13°</strong> du Code de la consommation,
              l&apos;acheteur renonce expressément à son droit de rétractation dès lors que la fourniture
              du contenu numérique commence avec son accord exprès. En validant son achat puis en
              accédant au lien de téléchargement, l&apos;acheteur accepte cette exécution immédiate et
              renonce à son droit de rétractation de 14 jours.
            </p>
          </div>
        </section>

        <section className={styles.section}>
          <h2><span className={styles.num}>08</span> Licences d&apos;utilisation</h2>
          <p>
            Chaque palier acheté confère à l&apos;acheteur une licence d&apos;utilisation dont les termes
            précis sont rappelés sur la fiche produit. Les types de licence proposés sont notamment :
          </p>
          <ul>
            <li><strong>Non-Exclusive</strong> : usage limité, redevances à reverser selon usages, l&apos;artiste conserve le droit de revendre la même prod à d&apos;autres acheteurs.</li>
            <li><strong>Non-Exclusive Premium</strong> : usage étendu (streams, ventes), conditions plus larges, non-exclusivité conservée.</li>
            <li><strong>Unlimited Non-Exclusive</strong> : pas de plafond de streams ni de ventes, non-exclusivité conservée.</li>
            <li><strong>Exclusive</strong> / <strong>Buyout</strong> : transfert exclusif des droits d&apos;exploitation à l&apos;acheteur, la prod est retirée de la vente.</li>
          </ul>
          <p>
            Sauf mention contraire, les <strong>droits d&apos;auteur moraux</strong> restent attachés à
            l&apos;artiste créateur conformément au Code de la propriété intellectuelle.
          </p>
        </section>

        <section className={styles.section}>
          <h2><span className={styles.num}>09</span> Garanties et réclamations</h2>
          <p>
            En cas de fichier corrompu, de lien expiré sans avoir pu effectuer le téléchargement ou
            d&apos;erreur manifeste de description, l&apos;acheteur peut adresser sa réclamation à{" "}
            <a href="mailto:contact@grandemaisonzoo.com">contact@grandemaisonzoo.com</a> dans un délai
            de <strong>14 jours</strong> suivant l&apos;achat. Voir notre{" "}
            <Link href="/legal/remboursement">politique de remboursement</Link> pour les modalités
            précises.
          </p>
        </section>

        <section className={styles.section}>
          <h2><span className={styles.num}>10</span> Responsabilité</h2>
          <p>
            La plateforme s&apos;engage à mettre tous les moyens en œuvre pour assurer la disponibilité
            du site et la bonne livraison numérique. Elle ne saurait être tenue responsable des
            indisponibilités résultant d&apos;une force majeure, d&apos;une intervention de maintenance ou
            d&apos;une défaillance des fournisseurs tiers (hébergeur, processeur de paiement).
          </p>
          <p>
            L&apos;acheteur est seul responsable de l&apos;usage qu&apos;il fait des fichiers achetés et du
            respect des termes de licence applicables.
          </p>
        </section>

        <section className={styles.section}>
          <h2><span className={styles.num}>11</span> Données personnelles</h2>
          <p>
            Les données collectées (email, informations de paiement) sont traitées conformément à
            notre <Link href="/legal/confidentialite">politique de confidentialité</Link>.
          </p>
        </section>

        <section className={styles.section}>
          <h2><span className={styles.num}>12</span> Droit applicable et litiges</h2>
          <p>
            Les présentes CGV sont régies par le <strong>droit français</strong>. En cas de litige,
            les parties s&apos;efforceront de trouver une solution amiable. À défaut, le différend sera
            porté devant les tribunaux français compétents.
          </p>
          <p>
            Conformément à l&apos;article L.612-1 du Code de la consommation, l&apos;acheteur consommateur a
            la possibilité de recourir gratuitement à un médiateur de la consommation en cas de
            litige. Le site européen de règlement en ligne des litiges est accessible à l&apos;adresse :{" "}
            <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer">
              ec.europa.eu/consumers/odr
            </a>.
          </p>
        </section>
      </div>
    </main>
  );
}
