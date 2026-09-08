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

// Suivi ATS d'un candidat (§ étoffement ATS interne).
export const SUIVI_TYPE = {
  NOTE: "NOTE",
  APPEL: "APPEL",
  RDV: "RDV",
  RAPPEL: "RAPPEL",
  STATUT: "STATUT", // généré automatiquement, jamais saisi manuellement
} as const;
export type SuiviType = (typeof SUIVI_TYPE)[keyof typeof SUIVI_TYPE];

export const SUIVI_TYPE_LABELS: Record<SuiviType, string> = {
  NOTE: "Note",
  APPEL: "Appel",
  RDV: "Rendez-vous",
  RAPPEL: "Rappel",
  STATUT: "Changement de statut",
};

// Types saisissables manuellement (STATUT est réservé au log automatique).
export const SUIVI_TYPE_SAISISSABLES = [
  SUIVI_TYPE.NOTE,
  SUIVI_TYPE.APPEL,
  SUIVI_TYPE.RDV,
  SUIVI_TYPE.RAPPEL,
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
