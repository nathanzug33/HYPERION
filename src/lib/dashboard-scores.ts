import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type DateRange = { debut: Date; fin: Date };

/** Une entrée "positionnée" pendant la période : l'action de programmer le
 * RDV/l'entretien a eu lieu pendant la période, quelle que soit la date à
 * laquelle il aura effectivement lieu. */
function positionneWhere(range: DateRange): Prisma.DateTimeFilter {
  return { gte: range.debut, lte: range.fin };
}

export type AtsScore = {
  pris: number;
  prevus: number;
  realises: number;
};

/** Score ATS (entretiens, type "RDV" sur SuiviCandidat) pour une période
 * donnée : pris (programmés pendant la période, quelle que soit la date de
 * l'entretien), prévus (dont la date d'entretien tombe dans la période,
 * qu'ils aient eu lieu ou non), réalisés (dont la date d'entretien tombe
 * dans la période ET marqués faits — statut explicite, jamais déduit de la
 * date). */
export async function computeAtsScore(
  consultantFilter: Prisma.ConsultantWhereInput,
  range: DateRange
): Promise<AtsScore> {
  const [pris, prevus, realises] = await Promise.all([
    prisma.suiviCandidat.count({
      where: { type: "RDV", consultant: consultantFilter, createdAt: positionneWhere(range) },
    }),
    prisma.suiviCandidat.count({
      where: { type: "RDV", consultant: consultantFilter, dateProgrammee: positionneWhere(range) },
    }),
    prisma.suiviCandidat.count({
      where: {
        type: "RDV",
        consultant: consultantFilter,
        dateProgrammee: positionneWhere(range),
        fait: true,
      },
    }),
  ]);
  return { pris, prevus, realises };
}

export type CrmTypeScore = {
  positionnees: number;
  realisees: number;
  aVenir: number;
};

/** Score CRM (RDV prospection ou RT) pour une période donnée : positionnées
 * (programmées pendant la période), réalisées (dont la date tombe dans la
 * période ET marquées faites), à venir (dont la date tombe dans la période,
 * qu'elles soient déjà faites ou non — utilisé pour une semaine future). */
export async function computeCrmTypeScore(
  entrepriseFilter: Prisma.EntrepriseWhereInput,
  type: "RDV" | "RDV_TECHNIQUE",
  range: DateRange
): Promise<CrmTypeScore> {
  const [positionnees, realisees, aVenir] = await Promise.all([
    prisma.suiviCommercial.count({
      where: { type, entreprise: entrepriseFilter, createdAt: positionneWhere(range) },
    }),
    prisma.suiviCommercial.count({
      where: { type, entreprise: entrepriseFilter, dateProgrammee: positionneWhere(range), fait: true },
    }),
    prisma.suiviCommercial.count({
      where: { type, entreprise: entrepriseFilter, dateProgrammee: positionneWhere(range) },
    }),
  ]);
  return { positionnees, realisees, aVenir };
}
