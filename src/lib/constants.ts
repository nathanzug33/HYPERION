// Valeurs métier centralisées (équivalent d'enums, portable SQLite/PostgreSQL).

export const ROLES = {
  ADMIN: "ADMIN",
  DIRECTEUR_BU: "DIRECTEUR_BU",
  BM: "BM",
  CLIENT: "CLIENT",
} as const;
export type Role = (typeof ROLES)[keyof typeof ROLES];

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Administrateur",
  DIRECTEUR_BU: "Directeur de BU",
  BM: "Business manager",
  CLIENT: "Client",
};

// Rôles ayant une vue globale du back-office (hors client). Le Directeur de
// BU voit tout (ATS + CRM, tous BM confondus) et peut réassigner le BM
// référent d'un dossier, mais n'a pas la main sur la gestion des
// utilisateurs, des référentiels, des journaux ni la purge RGPD (réservé à
// ADMIN).
export const ROLES_VUE_GLOBALE = [ROLES.ADMIN, ROLES.DIRECTEUR_BU] as const;

/** Admin ou Directeur de BU : peut voir tous les comptes (CRM) et réassigner
 * le BM référent d'un dossier (candidat ou entreprise). */
export function canReassignReferent(user: { role: string }): boolean {
  return (ROLES_VUE_GLOBALE as readonly string[]).includes(user.role);
}

export const STATUT_PUBLICATION = {
  BROUILLON: "BROUILLON",
  PUBLIEE: "PUBLIEE",
  DEPUBLIEE: "DEPUBLIEE",
  ARCHIVEE: "ARCHIVEE",
} as const;
export type StatutPublication =
  (typeof STATUT_PUBLICATION)[keyof typeof STATUT_PUBLICATION];

export const STATUT_PUBLICATION_LABELS: Record<StatutPublication, string> = {
  BROUILLON: "Brouillon",
  PUBLIEE: "Publiée",
  DEPUBLIEE: "Dépubliée",
  ARCHIVEE: "Archivée",
};

// Affichage "Bibliothèque" (côté fiche/liste candidat) : un dossier non
// publié est déjà pleinement dans le vivier ATS (une CVthèque qu'on
// enrichit) — "Brouillon" y est trompeur, laissé vide plutôt qu'affiché.
export function formatStatutBibliotheque(statut: string): string {
  if (statut === STATUT_PUBLICATION.PUBLIEE) return "Publié";
  if (statut === STATUT_PUBLICATION.DEPUBLIEE) return "Dépublié";
  if (statut === STATUT_PUBLICATION.ARCHIVEE) return "Archivé";
  return "";
}

export const STATUT_CANDIDAT_INTERNE = {
  EN_COURS: "EN_COURS",
  STAFFE: "STAFFE",
  // Staffé auparavant, sans mission active actuellement : coûte sans
  // facturer en face. Basculé automatiquement à la fin d'une mission si
  // aucune autre mission active n'existe pour ce consultant (§ marge).
  INTERCONTRAT: "INTERCONTRAT",
  INDISPONIBLE: "INDISPONIBLE",
  A_RECONTACTER: "A_RECONTACTER",
} as const;
export type StatutCandidatInterne =
  (typeof STATUT_CANDIDAT_INTERNE)[keyof typeof STATUT_CANDIDAT_INTERNE];

export const STATUT_CANDIDAT_INTERNE_LABELS: Record<
  StatutCandidatInterne,
  string
> = {
  EN_COURS: "En cours",
  STAFFE: "Staffé",
  INTERCONTRAT: "Intercontrat",
  INDISPONIBLE: "Indisponible",
  A_RECONTACTER: "À recontacter",
};

// Suivi ATS d'un candidat (§ étoffement ATS interne).
export const SUIVI_TYPE = {
  NOTE: "NOTE",
  APPEL: "APPEL",
  APPEL_SANS_REPONSE: "APPEL_SANS_REPONSE",
  RDV: "RDV", // libellé "Entretien" — clé conservée pour la sync Google Agenda existante
  RAPPEL: "RAPPEL",
  PLUS_DISPONIBLE: "PLUS_DISPONIBLE",
  REFUS: "REFUS",
  STATUT: "STATUT", // généré automatiquement, jamais saisi manuellement
} as const;
export type SuiviType = (typeof SUIVI_TYPE)[keyof typeof SUIVI_TYPE];

export const SUIVI_TYPE_LABELS: Record<SuiviType, string> = {
  NOTE: "Note",
  APPEL: "Appel",
  APPEL_SANS_REPONSE: "Appel sans réponse",
  RDV: "Entretien",
  RAPPEL: "Rappel",
  PLUS_DISPONIBLE: "Plus disponible",
  REFUS: "Refus / pas intéressé",
  STATUT: "Changement de statut",
};

// Types saisissables manuellement (STATUT est réservé au log automatique).
export const SUIVI_TYPE_SAISISSABLES = [
  SUIVI_TYPE.NOTE,
  SUIVI_TYPE.APPEL,
  SUIVI_TYPE.APPEL_SANS_REPONSE,
  SUIVI_TYPE.RDV,
  SUIVI_TYPE.RAPPEL,
  SUIVI_TYPE.PLUS_DISPONIBLE,
  SUIVI_TYPE.REFUS,
] as const;

// Suivi CRM (§ CRM complet) : éventail plus large que l'ATS, avec les
// actions commerciales classiques (email, proposition envoyée, contrat
// signé…). Distinct de SUIVI_TYPE pour ne pas faire apparaître ces types
// côté candidats, où ils n'ont pas de sens.
export const SUIVI_COMMERCIAL_TYPE = {
  NOTE: "NOTE",
  APPEL: "APPEL",
  EMAIL: "EMAIL",
  RDV: "RDV",
  RAPPEL: "RAPPEL",
  PROPOSITION_ENVOYEE: "PROPOSITION_ENVOYEE",
  CONTRAT_SIGNE: "CONTRAT_SIGNE",
  STATUT: "STATUT", // généré automatiquement, jamais saisi manuellement
} as const;
export type SuiviCommercialType =
  (typeof SUIVI_COMMERCIAL_TYPE)[keyof typeof SUIVI_COMMERCIAL_TYPE];

export const SUIVI_COMMERCIAL_TYPE_LABELS: Record<SuiviCommercialType, string> = {
  NOTE: "Note",
  APPEL: "Appel",
  EMAIL: "Email",
  RDV: "Rendez-vous",
  RAPPEL: "Rappel",
  PROPOSITION_ENVOYEE: "Proposition envoyée",
  CONTRAT_SIGNE: "Contrat signé",
  STATUT: "Changement de statut",
};

export const SUIVI_COMMERCIAL_TYPE_SAISISSABLES = [
  SUIVI_COMMERCIAL_TYPE.NOTE,
  SUIVI_COMMERCIAL_TYPE.APPEL,
  SUIVI_COMMERCIAL_TYPE.EMAIL,
  SUIVI_COMMERCIAL_TYPE.RDV,
  SUIVI_COMMERCIAL_TYPE.RAPPEL,
  SUIVI_COMMERCIAL_TYPE.PROPOSITION_ENVOYEE,
  SUIVI_COMMERCIAL_TYPE.CONTRAT_SIGNE,
] as const;

// Modalité d'un échange commercial — pertinente surtout pour RDV et APPEL.
export const MODALITE_RDV = {
  VISIO: "VISIO",
  PHYSIQUE: "PHYSIQUE",
  TELEPHONE: "TELEPHONE",
} as const;
export type ModaliteRdv = (typeof MODALITE_RDV)[keyof typeof MODALITE_RDV];

export const MODALITE_RDV_LABELS: Record<ModaliteRdv, string> = {
  VISIO: "Visio",
  PHYSIQUE: "Physique",
  TELEPHONE: "Téléphone",
};

export const DISPONIBILITE = {
  IMMEDIATE: "IMMEDIATE",
  SOUS_1_MOIS: "SOUS_1_MOIS",
  SOUS_2_MOIS: "SOUS_2_MOIS",
  SUR_PREAVIS: "SUR_PREAVIS",
} as const;
export type Disponibilite = (typeof DISPONIBILITE)[keyof typeof DISPONIBILITE];

export const DISPONIBILITE_LABELS: Record<Disponibilite, string> = {
  IMMEDIATE: "Disponibilité immédiate",
  SOUS_1_MOIS: "Sous 1 mois",
  SOUS_2_MOIS: "Sous 2 mois",
  SUR_PREAVIS: "Sur préavis",
};

export const TYPE_CONTRAT = {
  REGIE: "REGIE",
  FORFAIT: "FORFAIT",
  TEMPS_PARTAGE: "TEMPS_PARTAGE",
} as const;
export type TypeContrat = (typeof TYPE_CONTRAT)[keyof typeof TYPE_CONTRAT];

export const TYPE_CONTRAT_LABELS: Record<TypeContrat, string> = {
  REGIE: "Régie",
  FORFAIT: "Forfait",
  TEMPS_PARTAGE: "Temps partagé",
};

// Nature du contrat de travail du consultant (§ pilotage financier) —
// distinct de TYPE_CONTRAT (régie/forfait/temps partagé : modalité de la
// mission côté client). Conditionne le calcul du coût journalier dans
// src/lib/marge.ts : un salarié (CDI/CDIC) coûte son salaire annualisé avec
// charges patronales, un indépendant coûte exactement le TJM qu'on lui paie.
export const NATURE_CONTRAT = {
  CDI: "CDI",
  CDIC: "CDIC",
  INDEPENDANT: "INDEPENDANT",
} as const;
export type NatureContrat = (typeof NATURE_CONTRAT)[keyof typeof NATURE_CONTRAT];

export const NATURE_CONTRAT_LABELS: Record<NatureContrat, string> = {
  CDI: "CDI",
  CDIC: "CDI de chantier (CDIC)",
  INDEPENDANT: "Indépendant",
};

export const CONTACT_REQUEST_STATUS = {
  NOUVELLE: "NOUVELLE",
  EN_COURS: "EN_COURS",
  TRAITEE: "TRAITEE",
  SANS_SUITE: "SANS_SUITE",
} as const;
export type ContactRequestStatus =
  (typeof CONTACT_REQUEST_STATUS)[keyof typeof CONTACT_REQUEST_STATUS];

export const CONTACT_REQUEST_STATUS_LABELS: Record<
  ContactRequestStatus,
  string
> = {
  NOUVELLE: "Nouvelle",
  EN_COURS: "En cours",
  TRAITEE: "Traitée",
  SANS_SUITE: "Sans suite",
};

// Statut commercial d'une entreprise CRM (§ étoffement ERP).
export const STATUT_ENTREPRISE = {
  PROSPECT: "PROSPECT",
  EN_COURS: "EN_COURS", // qualification en cours
  CLIENT: "CLIENT",
  PERDU: "PERDU",
} as const;
export type StatutEntreprise =
  (typeof STATUT_ENTREPRISE)[keyof typeof STATUT_ENTREPRISE];

export const STATUT_ENTREPRISE_LABELS: Record<StatutEntreprise, string> = {
  PROSPECT: "Prospect",
  EN_COURS: "En cours de qualification",
  CLIENT: "Client",
  PERDU: "Perdu / inactif",
};

// Les 2 grands secteurs prédominants de l'ESN — écho aux spécialisations
// des BM (plutôt Industrie, plutôt Digital). Si "INDUSTRIE" : le sous-secteur
// précis est choisi via le référentiel Industrie (admin-éditable).
export const SECTEUR_CATEGORIE = {
  INDUSTRIE: "INDUSTRIE",
  DIGITAL: "DIGITAL",
} as const;
export type SecteurCategorie =
  (typeof SECTEUR_CATEGORIE)[keyof typeof SECTEUR_CATEGORIE];

export const SECTEUR_CATEGORIE_LABELS: Record<SecteurCategorie, string> = {
  INDUSTRIE: "Industrie",
  DIGITAL: "Digital",
};

export function formatSecteurActivite(
  secteurCategorie: string | null,
  industrieLabel?: string | null
): string {
  if (!secteurCategorie) return "";
  const label =
    SECTEUR_CATEGORIE_LABELS[secteurCategorie as SecteurCategorie] ?? secteurCategorie;
  return industrieLabel ? `${label} — ${industrieLabel}` : label;
}

// Statut d'un besoin saisi par un BM après un RDV client (§ pipeline
// staffing) — distinct des statuts de DemandeBesoin (portail client).
export const STATUT_BESOIN = {
  OUVERT: "OUVERT",
  GAGNE: "GAGNE",
  PERDU: "PERDU",
  ABANDONNE: "ABANDONNE",
} as const;
export type StatutBesoin = (typeof STATUT_BESOIN)[keyof typeof STATUT_BESOIN];

export const STATUT_BESOIN_LABELS: Record<StatutBesoin, string> = {
  OUVERT: "Ouvert",
  GAGNE: "Gagné",
  PERDU: "Perdu",
  ABANDONNE: "Abandonné",
};

// Avancement d'un candidat associé à un besoin.
export const STATUT_BESOIN_CANDIDAT = {
  PROPOSE: "PROPOSE",
  RDV_QUALIFICATION: "RDV_QUALIFICATION",
  RETENU: "RETENU",
  ECARTE: "ECARTE",
} as const;
export type StatutBesoinCandidat =
  (typeof STATUT_BESOIN_CANDIDAT)[keyof typeof STATUT_BESOIN_CANDIDAT];

export const STATUT_BESOIN_CANDIDAT_LABELS: Record<StatutBesoinCandidat, string> = {
  PROPOSE: "Proposé",
  RDV_QUALIFICATION: "RDV de qualification",
  RETENU: "Retenu",
  ECARTE: "Écarté",
};

// Statut d'une mission (consultant staffé chez un client) — créée
// automatiquement quand un besoin passe à GAGNE avec un candidat retenu.
export const STATUT_MISSION = {
  EN_COURS: "EN_COURS",
  TERMINEE: "TERMINEE",
  ROMPUE: "ROMPUE",
} as const;
export type StatutMission = (typeof STATUT_MISSION)[keyof typeof STATUT_MISSION];

export const STATUT_MISSION_LABELS: Record<StatutMission, string> = {
  EN_COURS: "En cours",
  TERMINEE: "Terminée",
  ROMPUE: "Rompue",
};

// Missions dont la fin prévue approche (alerte "portefeuille de missions").
export const MISSION_ALERTE_FIN_JOURS = 30;

// Statut de publication d'une offre (§ brique ATS "Offres") — même logique
// que STATUT_PUBLICATION (Consultant) avec un état supplémentaire POURVUE
// (poste comblé, distinct d'un simple archivage).
export const STATUT_OFFRE = {
  BROUILLON: "BROUILLON",
  PUBLIEE: "PUBLIEE",
  POURVUE: "POURVUE",
  DEPUBLIEE: "DEPUBLIEE",
  ARCHIVEE: "ARCHIVEE",
} as const;
export type StatutOffre = (typeof STATUT_OFFRE)[keyof typeof STATUT_OFFRE];

export const STATUT_OFFRE_LABELS: Record<StatutOffre, string> = {
  BROUILLON: "Brouillon",
  PUBLIEE: "Publiée",
  POURVUE: "Pourvue",
  DEPUBLIEE: "Dépubliée",
  ARCHIVEE: "Archivée",
};

// Nature du contrat proposé par une offre — distinct de NATURE_CONTRAT
// (contrat réel du consultant une fois staffé) : une offre peut aussi
// proposer un stage ou une alternance, non applicables à un consultant déjà
// en poste.
export const TYPE_CONTRAT_OFFRE = {
  CDI: "CDI",
  CDIC: "CDIC",
  INDEPENDANT: "INDEPENDANT",
  STAGE: "STAGE",
  ALTERNANCE: "ALTERNANCE",
} as const;
export type TypeContratOffre = (typeof TYPE_CONTRAT_OFFRE)[keyof typeof TYPE_CONTRAT_OFFRE];

export const TYPE_CONTRAT_OFFRE_LABELS: Record<TypeContratOffre, string> = {
  CDI: "CDI",
  CDIC: "CDI de chantier (CDIC)",
  INDEPENDANT: "Indépendant / freelance",
  STAGE: "Stage",
  ALTERNANCE: "Alternance",
};

// Avancement d'une candidature reçue sur une offre publique.
export const STATUT_CANDIDATURE = {
  NOUVELLE: "NOUVELLE",
  EN_COURS: "EN_COURS",
  AJOUTEE_VIVIER: "AJOUTEE_VIVIER",
  REJETEE: "REJETEE",
} as const;
export type StatutCandidature = (typeof STATUT_CANDIDATURE)[keyof typeof STATUT_CANDIDATURE];

export const STATUT_CANDIDATURE_LABELS: Record<StatutCandidature, string> = {
  NOUVELLE: "Nouvelle",
  EN_COURS: "En cours d'étude",
  AJOUTEE_VIVIER: "Ajoutée au vivier",
  REJETEE: "Rejetée",
};

// Coefficient de charges patronales appliqué au salaire brut pour obtenir le
// coût employeur, et nombre de jours facturables par an (forfait jours
// France) — base du calcul de coût/marge journalière (§ pilotage financier,
// voir src/lib/marge.ts).
export const COEFFICIENT_CHARGES_PATRONALES = 1.75;
export const JOURS_FACTURABLES_PAR_AN = 218;
// Cible de marge brute journalière (€/j) utilisée pour suggérer un TJM mini
// à proposer à partir du coût journalier salarié (§ fiche candidat).
export const OBJECTIF_MARGE_BRUTE_JOURNALIERE = 135;

// Durées estimées proposées pour une demande de besoin (§ espace client).
export const DUREE_ESTIMEE_OPTIONS = [
  "Moins d'1 mois",
  "1 à 3 mois",
  "3 à 6 mois",
  "6 à 12 mois",
  "Plus d'1 an",
  "Indéterminée",
] as const;

// Niveaux 1 (notions) à 5 (expert) — gabarit HYPERION (compétences & langues).
export const NIVEAU_LABELS: Record<number, string> = {
  1: "Notions",
  2: "Junior",
  3: "Confirmé",
  4: "Senior",
  5: "Expert",
};

export const COMPETENCE_CATEGORIES = {
  DOMAINES: "DOMAINES",
  LOGICIELS_OUTILS: "LOGICIELS_OUTILS",
  METHODES_NORMES: "METHODES_NORMES",
  SECTEURS: "SECTEURS",
  MANAGEMENT: "MANAGEMENT",
} as const;
export type CompetenceCategorieType =
  (typeof COMPETENCE_CATEGORIES)[keyof typeof COMPETENCE_CATEGORIES];

export const COMPETENCE_CATEGORIE_LABELS: Record<CompetenceCategorieType, string> = {
  DOMAINES: "Domaines",
  LOGICIELS_OUTILS: "Logiciels & outils",
  METHODES_NORMES: "Méthodes & normes",
  SECTEURS: "Secteurs",
  MANAGEMENT: "Management",
};

export const FORMATION_TYPE = {
  FORMATION: "FORMATION",
  CERTIFICATION: "CERTIFICATION",
} as const;
export type FormationType = (typeof FORMATION_TYPE)[keyof typeof FORMATION_TYPE];

// Seuil de fraîcheur (§5.2 / §10) : au-delà, une fiche publiée est signalée.
export const FICHE_FRAICHEUR_SEUIL_JOURS = Number(
  process.env.FICHE_FRAICHEUR_SEUIL_JOURS ?? 30
);

// Timeout d'inactivité de session (§5.1).
export const SESSION_IDLE_TIMEOUT_MINUTES = Number(
  process.env.SESSION_IDLE_TIMEOUT_MINUTES ?? 30
);

// Verrouillage temporaire du compte après plusieurs échecs de connexion
// consécutifs (protection brute-force sur le mot de passe).
export const MAX_FAILED_LOGIN_ATTEMPTS = 5;
export const LOCKOUT_DURATION_MINUTES = 15;
