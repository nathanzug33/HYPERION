import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/guards";
import { ROLES, canReassignReferent } from "@/lib/constants";
import { entrepriseVisibilityWhere } from "@/lib/crm-access";
import { coutJournalier, margeJournaliere, margeMensuelle } from "@/lib/marge";
import { setJoursTravaillesAction } from "../actions";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

const MOIS_LABELS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

const HISTORIQUE_MOIS = 6;

function euros(n: number | null): string {
  if (n == null) return "—";
  return `${Math.round(n).toLocaleString("fr-FR")} €`;
}

export default async function MargePage({
  searchParams,
}: {
  searchParams: Promise<{ annee?: string; mois?: string; businessManagerId?: string }>;
}) {
  const session = await requireStaff();
  const peutFiltrerParBm = canReassignReferent(session.user);
  const { annee: anneeRaw, mois: moisRaw, businessManagerId } = await searchParams;

  const now = new Date();
  const annee = anneeRaw ? Number(anneeRaw) : now.getFullYear();
  const mois = moisRaw ? Number(moisRaw) : now.getMonth() + 1;

  // Fenêtre des HISTORIQUE_MOIS derniers mois (mois sélectionné inclus),
  // pour le graphique de tendance.
  const moisWindow: { annee: number; mois: number }[] = [];
  for (let i = HISTORIQUE_MOIS - 1; i >= 0; i--) {
    const d = new Date(annee, mois - 1 - i, 1);
    moisWindow.push({ annee: d.getFullYear(), mois: d.getMonth() + 1 });
  }
  const debutFenetre = new Date(moisWindow[0].annee, moisWindow[0].mois - 1, 1);
  const finFenetre = new Date(annee, mois, 0, 23, 59, 59);

  const entrepriseFilter = entrepriseVisibilityWhere(session.user);
  const where: Prisma.MissionWhereInput = {
    AND: [
      { entreprise: entrepriseFilter },
      peutFiltrerParBm && businessManagerId ? { businessManagerId } : {},
      { dateDebut: { lte: finFenetre } },
      { OR: [{ dateFinReelle: null }, { dateFinReelle: { gte: debutFenetre } }] },
    ],
  };

  const [missions, bms] = await Promise.all([
    prisma.mission.findMany({
      where,
      include: {
        consultant: true,
        entreprise: true,
        businessManager: true,
        joursTravailles: {
          where: { OR: moisWindow.map((m) => ({ annee: m.annee, mois: m.mois })) },
        },
      },
      orderBy: { dateDebut: "desc" },
    }),
    peutFiltrerParBm
      ? prisma.user.findMany({ where: { role: ROLES.BM, active: true }, orderBy: { name: "asc" } })
      : Promise.resolve([]),
  ]);

  // Marge/CA par mois de la fenêtre (toutes missions du périmètre confondues).
  const tendance = moisWindow.map(({ annee: a, mois: m }) => {
    let margeTotale = 0;
    let caTotal = 0;
    for (const mission of missions) {
      const jt = mission.joursTravailles.find((j) => j.annee === a && j.mois === m);
      const jours = jt?.joursTravailles ?? 0;
      const coutJour = coutJournalier(mission.consultant);
      const margeJour = margeJournaliere(mission.tjm, coutJour);
      margeTotale += margeMensuelle(margeJour, jours) ?? 0;
      caTotal += (mission.tjm ?? 0) * jours;
    }
    return { annee: a, mois: m, marge: margeTotale, ca: caTotal };
  });

  const moisSelectionne = tendance[tendance.length - 1];
  const maxAbsMarge = Math.max(1, ...tendance.map((t) => Math.abs(t.marge)));

  // Détail par mission pour le mois sélectionné (table + saisie des jours).
  const detailMois = missions.map((mission) => {
    const jt = mission.joursTravailles.find((j) => j.annee === annee && j.mois === mois);
    const jours = jt?.joursTravailles ?? 0;
    const coutJour = coutJournalier(mission.consultant);
    const margeJour = margeJournaliere(mission.tjm, coutJour);
    return {
      mission,
      jours,
      coutJour,
      margeJour,
      margeMois: margeMensuelle(margeJour, jours),
      caMois: (mission.tjm ?? 0) * jours,
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-brand-ink">CA &amp; Marge</h1>
          <p className="mt-1 text-sm text-brand-gray">
            Salarié (CDI/CDIC) : coût journalier = (salaire brut annuel × 1,75 + frais annuels) / 218.
            Indépendant : coût journalier = TJM payé + frais annuels / 218. Marge journalière = TJM
            client − coût journalier.
          </p>
        </div>
        <Link href="/admin/missions" className="link-underline text-sm text-brand-gray hover:text-brand-ink">
          ← Portefeuille de missions
        </Link>
      </div>

      <form className="card flex flex-wrap items-center gap-2 p-3">
        <select name="mois" defaultValue={mois} className="input w-40">
          {MOIS_LABELS.map((label, i) => (
            <option key={label} value={i + 1}>
              {label}
            </option>
          ))}
        </select>
        <input type="number" name="annee" defaultValue={annee} className="input w-24" />
        {peutFiltrerParBm && (
          <select name="businessManagerId" defaultValue={businessManagerId ?? ""} className="input w-56">
            <option value="">Tous les BM référents</option>
            {bms.map((bm) => (
              <option key={bm.id} value={bm.id}>
                {bm.name}
              </option>
            ))}
          </select>
        )}
        <button type="submit" className="btn btn-secondary">
          Filtrer
        </button>
      </form>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <div className="card p-4">
          <div className="text-3xl font-semibold text-brand-ink">{euros(moisSelectionne.ca)}</div>
          <div className="mt-1 text-xs text-brand-gray">
            CA — {MOIS_LABELS[mois - 1]} {annee}
          </div>
        </div>
        <div className="card p-4">
          <div
            className={`text-3xl font-semibold ${moisSelectionne.marge < 0 ? "text-red-600" : "text-brand-green"}`}
          >
            {euros(moisSelectionne.marge)}
          </div>
          <div className="mt-1 text-xs text-brand-gray">
            Marge — {MOIS_LABELS[mois - 1]} {annee}
          </div>
        </div>
        <div className="card p-4">
          <div className="text-3xl font-semibold text-brand-ink">{missions.length}</div>
          <div className="mt-1 text-xs text-brand-gray">Missions dans le périmètre</div>
        </div>
      </div>

      <div className="card p-5">
        <h2 className="mb-4 text-sm font-semibold text-brand-ink">
          Marge — {HISTORIQUE_MOIS} derniers mois
        </h2>
        <div className="space-y-2">
          {tendance.map((t) => {
            const pct = (Math.abs(t.marge) / maxAbsMarge) * 100;
            const negatif = t.marge < 0;
            return (
              <div key={`${t.annee}-${t.mois}`} className="flex items-center gap-3 text-sm">
                <span className="w-28 shrink-0 text-brand-body">
                  {MOIS_LABELS[t.mois - 1].slice(0, 3)} {t.annee}
                </span>
                <div className="relative h-5 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full ${negatif ? "bg-red-400" : "bg-brand-green"}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span
                  className={`w-28 shrink-0 text-right text-xs font-medium ${
                    negatif ? "text-red-600" : "text-brand-body"
                  }`}
                >
                  {euros(t.marge)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="card overflow-x-auto p-0">
        <div className="p-5 pb-0">
          <h2 className="text-sm font-semibold text-brand-ink">
            Détail — {MOIS_LABELS[mois - 1]} {annee}
          </h2>
        </div>
        {detailMois.length === 0 ? (
          <p className="p-5 text-sm text-brand-gray">Aucune mission dans ce périmètre.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-brand-gray">
              <tr>
                <th className="px-4 py-3">Consultant</th>
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3">BM référent</th>
                <th className="px-4 py-3">TJM</th>
                <th className="px-4 py-3">Coût/jour</th>
                <th className="px-4 py-3">Marge/jour</th>
                <th className="px-4 py-3">Jours travaillés</th>
                <th className="px-4 py-3">CA du mois</th>
                <th className="px-4 py-3">Marge du mois</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {detailMois.map(({ mission, jours, coutJour, margeJour, margeMois, caMois }) => (
                <tr key={mission.id} className="hover:bg-brand-blue-bg-soft">
                  <td className="px-4 py-2.5 font-medium text-brand-ink">
                    {mission.consultant.prenom} {mission.consultant.nom}
                  </td>
                  <td className="px-4 py-2.5 text-brand-body">{mission.entreprise.nom}</td>
                  <td className="px-4 py-2.5 text-brand-body">{mission.businessManager.name}</td>
                  <td className="px-4 py-2.5 text-brand-body">{mission.tjm ? `${mission.tjm} €` : "—"}</td>
                  <td className="px-4 py-2.5 text-brand-body">{euros(coutJour)}</td>
                  <td
                    className={`px-4 py-2.5 ${
                      margeJour != null && margeJour < 0 ? "text-red-600" : "text-brand-body"
                    }`}
                  >
                    {euros(margeJour)}
                  </td>
                  <td className="px-4 py-2.5">
                    <form action={setJoursTravaillesAction} className="flex items-center gap-1">
                      <input type="hidden" name="missionId" value={mission.id} />
                      <input type="hidden" name="annee" value={annee} />
                      <input type="hidden" name="mois" value={mois} />
                      <input
                        type="number"
                        name="joursTravailles"
                        min={0}
                        max={31}
                        defaultValue={jours}
                        className="input w-16 py-1 text-xs"
                      />
                      <button type="submit" className="link-underline text-xs text-brand-blue-dark">
                        OK
                      </button>
                    </form>
                  </td>
                  <td className="px-4 py-2.5 text-brand-body">{euros(caMois)}</td>
                  <td
                    className={`px-4 py-2.5 font-medium ${
                      margeMois != null && margeMois < 0 ? "text-red-600" : "text-brand-green"
                    }`}
                  >
                    {euros(margeMois)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
