export const metadata = { title: "Politique de confidentialité" };

export default function ConfidentialitePage() {
  return (
    <>
      <h1>Politique de confidentialité</h1>
      <p>
        <em>Document de travail — à faire relire par un conseil juridique
        avant mise en production.</em>
      </p>

      <h2>Données concernant les consultants</h2>
      <p>
        Les collaborateurs de la société renseignent, avec le consentement
        explicite et horodaté du consultant, un dossier de compétences
        interne. Une projection anonymisée de ce dossier peut être publiée
        dans la bibliothèque, avec un consentement spécifique et distinct
        du consultant pour cette publication. Aucune donnée nominative
        (nom, coordonnées) n&apos;est jamais exposée dans la bibliothèque
        client.
      </p>

      <h2>Durée de conservation</h2>
      <p>
        Les données candidats sont conservées pendant une durée définie
        (par défaut 24 mois après le dernier contact), au-delà de laquelle
        elles sont purgées ou une alerte de révision est déclenchée. Le
        consultant peut à tout moment demander l&apos;accès, la
        rectification ou l&apos;effacement de ses données.
      </p>

      <h2>Données concernant les utilisateurs du portail (clients)</h2>
      <p>
        Les comptes clients sont créés manuellement par un administrateur.
        Les connexions et consultations de fiches sont journalisées à des
        fins de suivi commercial et de sécurité (traçabilité des accès à
        des données professionnelles sensibles). Ces journaux sont
        accessibles aux seuls administrateurs.
      </p>

      <h2>Sécurité</h2>
      <p>
        Mots de passe hachés, connexions chiffrées (HTTPS), accès aux
        données personnelles restreint par rôle, hébergement au sein de
        l&apos;Union européenne.
      </p>

      <h2>Vos droits</h2>
      <p>
        Conformément au RGPD, vous disposez d&apos;un droit d&apos;accès,
        de rectification, d&apos;effacement et de limitation du traitement
        de vos données. Pour l&apos;exercer, contactez [à compléter].
      </p>

      <h2>Cookies</h2>
      <p>
        Ce site n&apos;utilise que des cookies techniques strictement
        nécessaires au fonctionnement de l&apos;authentification (session).
        Aucun cookie de mesure d&apos;audience ou publicitaire
        n&apos;est déposé.
      </p>
    </>
  );
}
