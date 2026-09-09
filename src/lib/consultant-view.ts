import { Prisma } from "@prisma/client";

// Sélection strictement limitée aux champs exposables : ce type garantit
// qu'aucun champ interne (nom, email, notes…) ne peut fuiter dans les
// composants qui affichent la bibliothèque côté client.
export const consultantPublicSelect = {
  id: true,
  referenceAnonyme: true,
  intitulePoste: true,
  anneesExperienceMin: true,
  anneesExperienceMax: true,
  resumeContexte: true,
  presentationCourte: true,
  disponibilite: true,
  typeContrat: true,
  ouvertGrandDeplacement: true,
  rayonKm: true,
  villeRattachement: true,
  villeLat: true,
  villeLng: true,
  statutPublication: true,
  updatedAt: true,
  seniority: { select: { id: true, label: true, ordre: true } },
  secteurs: { select: { secteur: { select: { id: true, label: true } } } },
  expertises: { select: { expertise: { select: { id: true, label: true } } } },
  competences: {
    select: {
      estCle: true,
      competence: { select: { id: true, label: true } },
    },
  },
  typesMobilite: {
    select: { typeMobilite: { select: { id: true, label: true } } },
  },
  zonesGeographiques: {
    select: { zoneGeographique: { select: { id: true, label: true } } },
  },
  langues: {
    select: {
      niveau: true,
      detail: true,
      langue: { select: { id: true, label: true } },
    },
  },
  competenceCategories: {
    orderBy: { ordre: "asc" },
    select: { id: true, categorie: true, contenu: true, niveau: true },
  },
  formations: {
    orderBy: { ordre: "asc" },
    select: { id: true, type: true, annee: true, intitule: true, etablissement: true },
  },
  experiences: {
    orderBy: { ordre: "asc" },
    select: {
      id: true,
      entreprise: true,
      secteurActivite: true,
      missionTitre: true,
      dateDebut: true,
      dateFin: true,
      contexteObjectif: true,
      realisations: true,
      environnementTechnique: true,
    },
  },
} satisfies Prisma.ConsultantSelect;

export type ConsultantPublic = Prisma.ConsultantGetPayload<{
  select: typeof consultantPublicSelect;
}>;
