import type { Metadata } from "next";
import Link from "next/link";
import styles from "../legal.module.css";

export const metadata: Metadata = {
  title: "Politique de remboursement",
  description: "Conditions de remboursement et SAV pour les achats de prods sur GRANDEMAISONZOO.",
};

export default function RemboursementPage() {
  return (
    <main className={styles.page}>
      <div className={styles.inner}>
        <a href="/" className={styles.back}>
          <i className="fas fa-arrow-left" /> Retour à l&apos;accueil
        </a>

        <p className={styles.kicker}>Service après-vente</p>
        <h1 className={styles.title}>Politique de remboursement</h1>
        <p className={styles.lead}>
          Cette politique précise les conditions dans lesquelles un acheteur peut obtenir le
          remboursement d&apos;une prod achetée sur grandemaisonzoo.com.
        </p>
        <span className={styles.updated}>Dernière mise à jour : 27 juin 2026</span>

        <section className={styles.section}>
          <h2><span className={styles.num}>01</span> Principe — Produit numérique</h2>
          <div className={styles.warning}>
            <p>
              Les prods vendues sur le site sont des <strong>contenus numériques téléchargeables
              immédiatement</strong>. Conformément à l&apos;article L221-28 13° du Code de la
              consommation, le <strong>droit de rétractation de 14 jours ne s&apos;applique pas</strong>{" "}
              dès lors que la fourniture du contenu numérique a commencé avec l&apos;accord exprès du
              consommateur, ce qui est le cas dès la confirmation de l&apos;achat et l&apos;accès au lien de
              téléchargement.
            </p>
          </div>
          <p>
            Par conséquent, <strong>aucun remboursement ne peut être réclamé pour un simple
            changement d&apos;avis</strong> après accès au fichier acheté.
          </p>
        </section>

        <section className={styles.section}>
          <h2><span className={styles.num}>02</span> Cas où un remboursement est accordé</h2>
          <p>
            Nous procédons à un remboursement intégral dans les cas suivants :
          </p>
          <ul>
            <li><strong>Fichier corrompu ou illisible</strong> : si le fichier livré ne peut pas être ouvert par un lecteur audio standard ou un logiciel de production musicale courant.</li>
            <li><strong>Erreur manifeste de description</strong> : si le palier reçu ne correspond pas à ce qui était annoncé (ex. fichier MP3 au lieu de WAV promis, stems manquants).</li>
            <li><strong>Lien de téléchargement non fonctionnel</strong> dès l&apos;émission, sans solution de remplacement possible.</li>
            <li><strong>Double facturation</strong> en cas de bug technique.</li>
            <li><strong>Paiement frauduleux</strong> non autorisé par le titulaire de la carte.</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2><span className={styles.num}>03</span> Cas où un remboursement n&apos;est pas accordé</h2>
          <ul>
            <li>Changement d&apos;avis après téléchargement</li>
            <li>Mauvaise sélection de palier (ex. avoir acheté un palier MP3 alors qu&apos;on voulait WAV)</li>
            <li>Inaptitude personnelle à utiliser le fichier (compatibilité logicielle, manque de connaissance)</li>
            <li>Demande formulée plus de 14 jours après l&apos;achat</li>
            <li>Téléchargement déjà effectué sans signalement de problème dans un délai raisonnable</li>
          </ul>
          <p>
            Dans ces cas, l&apos;acheteur peut contacter directement l&apos;artiste vendeur pour discuter
            d&apos;un geste commercial éventuel — mais aucune obligation n&apos;incombe à la plateforme.
          </p>
        </section>

        <section className={styles.section}>
          <h2><span className={styles.num}>04</span> Comment demander un remboursement</h2>
          <p>
            Pour toute demande de remboursement, écris à{" "}
            <a href="mailto:contact@grandemaisonzoo.com">contact@grandemaisonzoo.com</a> en
            précisant :
          </p>
          <ul>
            <li>L&apos;adresse email utilisée pour l&apos;achat</li>
            <li>La date approximative de l&apos;achat</li>
            <li>Le nom de la prod et du palier concernés</li>
            <li>Le motif détaillé de la demande (ex. capture d&apos;écran de l&apos;erreur, log du lecteur)</li>
          </ul>
          <div className={styles.callout}>
            <p>
              Délai de traitement : <strong>7 jours ouvrés maximum</strong> pour la première réponse.
              Délai de remboursement effectif : <strong>5 à 10 jours ouvrés</strong> après accord, le
              temps que le remboursement transite par Stripe vers ton moyen de paiement initial.
            </p>
          </div>
        </section>

        <section className={styles.section}>
          <h2><span className={styles.num}>05</span> Modalités techniques</h2>
          <p>
            Les remboursements sont effectués via <strong>Stripe</strong>, sur le moyen de paiement
            d&apos;origine (carte bancaire, virement). Aucun remboursement ne peut être effectué par un
            autre moyen.
          </p>
          <p>
            En cas de Direct Charge sur le compte d&apos;un artiste vendeur, le remboursement est
            initié sur ce même compte, et la commission plateforme correspondante est restituée au
            prorata.
          </p>
        </section>

        <section className={styles.section}>
          <h2><span className={styles.num}>06</span> Litiges et chargebacks</h2>
          <p>
            Si tu n&apos;es pas satisfait du traitement de ta demande, tu peux ouvrir un litige
            directement auprès de Stripe ou de ta banque émettrice (chargeback). Cependant, nous
            préférons toujours résoudre les différends à l&apos;amiable — n&apos;hésite pas à nous écrire
            d&apos;abord pour gagner du temps.
          </p>
          <p>
            En cas de chargeback non justifié (notamment après téléchargement effectif et
            utilisation du fichier), GRANDE MAISON ZOO se réserve le droit de fournir à Stripe et à
            la banque toutes les preuves d&apos;exécution du contrat (logs de téléchargement,
            confirmation d&apos;email, etc.).
          </p>
        </section>

        <section className={styles.section}>
          <h2><span className={styles.num}>07</span> Voir aussi</h2>
          <p>
            <Link href="/legal/cgv">Conditions générales de vente</Link>
            {" — "}
            <Link href="/legal/confidentialite">Politique de confidentialité</Link>
            {" — "}
            <Link href="/legal/mentions-legales">Mentions légales</Link>
          </p>
        </section>
      </div>
    </main>
  );
}
