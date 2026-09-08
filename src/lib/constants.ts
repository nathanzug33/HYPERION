// Valeurs métier centralisées (équivalent d'enums, portable SQLite/PostgreSQL).

export const ROLES = {
  ADMIN: "ADMIN",
  BM: "BM",
  CLIENT: "CLIENT",
} as const;
export type Role = (typeof ROLES)[keyof typeof ROLES];

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Administrateur",
  BM: "Business manager",
  CLIENT: "Client",
};

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

export const STATUT_CANDIDAT_INTERNE = {
  EN_COURS: "EN_COURS",
  STAFFE: "STAFFE",
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
  INDISPONIBLE: "Indisponible",
  A_RECONTACTER: "À recontacter",
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
