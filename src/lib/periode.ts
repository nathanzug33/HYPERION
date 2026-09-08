// Résolution d'une période pour les KPI CRM du tableau de bord et le
// filtre de la page /admin/crm/activites — mêmes paramètres d'URL des deux
// côtés (periode, debut, fin) pour que les liens de tableau de bord
// pointent vers un filtre cohérent sur la page de détail.

import type { Prisma } from "@prisma/client";

export type PeriodeOption = "jour" | "semaine" | "mois" | "custom";

export type Periode = {
  debut: Date;
  fin: Date;
  periode: PeriodeOption;
  label: string;
  /** Repasse les mêmes paramètres dans une querystring (sans le "?"). */
  query: string;
};

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function resolvePeriode(sp: {
  periode?: string;
  debut?: string;
  fin?: string;
}): Periode {
  const now = new Date();

  if (sp.periode === "custom" && sp.debut && sp.fin) {
    const debut = new Date(`${sp.debut}T00:00:00`);
    const fin = new Date(`${sp.fin}T23:59:59.999`);
    if (!Number.isNaN(debut.getTime()) && !Number.isNaN(fin.getTime())) {
      return {
        debut,
        fin,
        periode: "custom",
        label: `du ${sp.debut} au ${sp.fin}`,
        query: `periode=custom&debut=${sp.debut}&fin=${sp.fin}`,
      };
    }
  }

  if (sp.periode === "jour") {
    const debut = new Date(now);
    debut.setHours(0, 0, 0, 0);
    const fin = new Date(now);
    fin.setHours(23, 59, 59, 999);
    return { debut, fin, periode: "jour", label: "aujourd'hui", query: "periode=jour" };
  }

  if (sp.periode === "semaine") {
    const day = now.getDay(); // 0 = dimanche
    const diffLundi = day === 0 ? -6 : 1 - day;
    const debut = new Date(now);
    debut.setDate(now.getDate() + diffLundi);
    debut.setHours(0, 0, 0, 0);
    const fin = new Date(debut);
    fin.setDate(debut.getDate() + 6);
    fin.setHours(23, 59, 59, 999);
    return { debut, fin, periode: "semaine", label: "cette semaine", query: "periode=semaine" };
  }

  // Défaut : mois en cours.
  const debut = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
  const fin = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  return { debut, fin, periode: "mois", label: "ce mois-ci", query: "periode=mois" };
}

export function periodeToInputDefaults(p: Periode): { debut: string; fin: string } {
  return { debut: toIsoDate(p.debut), fin: toIsoDate(p.fin) };
}

/** Filtre de date pour SuiviCommercial : une action programmée (RDV,
 * rappel) compte sur son échéance ; une action déjà réalisée (note, appel
 * passé, email, proposition, contrat signé…) compte sur sa date de saisie.
 * Utilisé à la fois pour les compteurs du tableau de bord et pour le filtre
 * de /admin/crm/activites, afin que les deux retombent sur les mêmes
 * éléments. */
export function suiviCommercialDateFilter(p: Periode): Prisma.SuiviCommercialWhereInput {
  return {
    OR: [
      { dateProgrammee: { gte: p.debut, lte: p.fin } },
      { AND: [{ dateProgrammee: null }, { createdAt: { gte: p.debut, lte: p.fin } }] },
    ],
  };
}
