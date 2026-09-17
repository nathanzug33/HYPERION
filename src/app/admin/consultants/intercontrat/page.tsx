import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/guards";
import {
  STATUT_CANDIDAT_INTERNE,
  STATUT_CANDIDAT_INTERNE_LABELS,
  STATUTS_IC_ED,
} from "@/lib/constants";
import { coutJournalier } from "@/lib/marge";
import { parseSort, nextSort, buildSortHref } from "@/lib/sort";
import SortableHeader from "@/components/SortableHeader";

export const dynamic = "force-dynamic";

const SORT_KEYS = ["nom", "statut", "profil", "cout", "mobilite"] as const;

// Page fixe, non personnalisable : contrairement aux futures « listes
// enregistrées » (filtres libres, modifiables, privés ou partagés), ce
// pilotage Intercontrat/ED doit toujours être visible tel quel par tout le
// monde — on lui donne donc sa propre page plutôt que d'en faire une liste
// enregistrée « par défaut » qu'un utilisateur pourrait modifier ou masquer.
export default async function IntercontratEdPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string }>;
}) {
  await requireStaff();
  const { sort } = await searchParams;
  const sortState = parseSort(sort, SORT_KEYS);
  const hrefFor = (key: string) =>
    buildSortHref("/admin/consultants/intercontrat", {}, nextSort(key, sortState));

  const consultants = await prisma.consultant.findMany({
    where: { statutCandidatInterne: { in: STATUTS_IC_ED } },
    include: {
      competences: { include: { competence: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  const rows = consultants.map((c) => {
    const compClesLabels = c.competences.filter((x) => x.estCle).map((x) => x.competence.label);
    const profil = [c.intitulePoste, compClesLabels.join(", ")].filter(Boolean).join(" — ");
    const mobiliteParts = [
      c.villeRattachement,
      c.rayonKm ? `${c.rayonKm} km` : null,
      c.ouvertGrandDeplacement ? "grand déplacement" : null,
    ].filter(Boolean);
    return {
      id: c.id,
      nom: c.nom,
      prenom: c.prenom,
      statut: c.statutCandidatInterne,
      profil,
      cout: coutJournalier(c),
      mobilite: mobiliteParts.join(" · ") || "—",
    };
  });

  const sorted = [...rows].sort((a, b) => {
    if (!sortState.key) return 0;
    const dir = sortState.dir === "asc" ? 1 : -1;
    switch (sortState.key) {
      case "nom":
        return dir * `${a.nom} ${a.prenom}`.localeCompare(`${b.nom} ${b.prenom}`);
      case "statut":
        return dir * a.statut.localeCompare(b.statut);
      case "profil":
        return dir * a.profil.localeCompare(b.profil);
      case "cout":
        return dir * ((a.cout ?? -1) - (b.cout ?? -1));
      case "mobilite":
        return dir * a.mobilite.localeCompare(b.mobilite);
      default:
        return 0;
    }
  });

  const countByStatut = (statut: string) => rows.filter((r) => r.statut === statut).length;
  const coutJournalierTotal = rows
    .filter((r) => r.statut !== STATUT_CANDIDAT_INTERNE.ED)
    .reduce((sum, r) => sum + (r.cout ?? 0), 0);

  const badgeStyle: Record<string, string> = {
    INTERCONTRAT_A_VENIR: "bg-amber-100 text-amber-700",
    INTERCONTRAT: "bg-red-100 text-red-700",
    ED: "bg-brand-blue/10 text-brand-blue-dark",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-brand-ink">Intercontrat / ED</h1>
        <p className="mt-1 text-sm text-brand-gray">
          Pilotage des consultants intercontrat (coût sans facturation en face) et des
          embauches directes — visible par toute l&apos;équipe, mis à jour depuis la fiche de
          chaque candidat.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="card p-4">
          <div className="text-2xl font-semibold text-amber-700">
            {countByStatut(STATUT_CANDIDAT_INTERNE.INTERCONTRAT_A_VENIR)}
          </div>
          <div className="mt-1 text-xs text-brand-gray">Intercontrat à venir</div>
        </div>
        <div className="card p-4">
          <div className="text-2xl font-semibold text-red-700">
            {countByStatut(STATUT_CANDIDAT_INTERNE.INTERCONTRAT)}
          </div>
          <div className="mt-1 text-xs text-brand-gray">Intercontrat (payé)</div>
        </div>
        <div className="card p-4">
          <div className="text-2xl font-semibold text-brand-blue-dark">
            {countByStatut(STATUT_CANDIDAT_INTERNE.ED)}
          </div>
          <div className="mt-1 text-xs text-brand-gray">Embauches directes</div>
        </div>
        <div className="card p-4">
          <div className="text-2xl font-semibold text-brand-ink">
            {coutJournalierTotal.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} €
          </div>
          <div className="mt-1 text-xs text-brand-gray">Coût journalier total (IC à venir + IC)</div>
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-100 bg-brand-blue-bg-soft text-left text-xs font-semibold uppercase tracking-wide text-brand-gray">
            <tr>
              <th className="px-4 py-2">
                <SortableHeader label="Nom / Prénom" sortKey="nom" current={sortState} href={hrefFor("nom")} />
              </th>
              <th className="px-4 py-2">
                <SortableHeader label="Statut" sortKey="statut" current={sortState} href={hrefFor("statut")} />
              </th>
              <th className="px-4 py-2">
                <SortableHeader label="Profil (mots-clés)" sortKey="profil" current={sortState} href={hrefFor("profil")} />
              </th>
              <th className="px-4 py-2">
                <SortableHeader label="Coût journalier" sortKey="cout" current={sortState} href={hrefFor("cout")} />
              </th>
              <th className="px-4 py-2">
                <SortableHeader label="Mobilité" sortKey="mobilite" current={sortState} href={hrefFor("mobilite")} />
              </th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sorted.map((r) => (
              <tr key={r.id} className="transition-colors hover:bg-brand-blue-bg-soft">
                <td className="px-4 py-2 font-medium text-brand-ink">
                  {r.nom} {r.prenom}
                </td>
                <td className="px-4 py-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${badgeStyle[r.statut] ?? "bg-slate-100 text-brand-gray"}`}
                  >
                    {STATUT_CANDIDAT_INTERNE_LABELS[
                      r.statut as keyof typeof STATUT_CANDIDAT_INTERNE_LABELS
                    ] ?? r.statut}
                  </span>
                </td>
                <td className="px-4 py-2 text-brand-body">{r.profil || "—"}</td>
                <td className="px-4 py-2 text-brand-body">
                  {r.cout != null
                    ? `${r.cout.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} €`
                    : "—"}
                </td>
                <td className="px-4 py-2 text-brand-body">{r.mobilite}</td>
                <td className="px-4 py-2 text-right">
                  <Link href={`/admin/consultants/${r.id}`} className="link-underline text-sm text-brand-blue-dark">
                    Voir la fiche
                  </Link>
                </td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-sm text-brand-gray">
                  Aucun consultant en intercontrat ou embauche directe actuellement.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
