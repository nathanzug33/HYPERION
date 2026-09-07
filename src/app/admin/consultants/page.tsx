import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/guards";
import {
  ROLES,
  STATUT_PUBLICATION_LABELS,
  FICHE_FRAICHEUR_SEUIL_JOURS,
} from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function ConsultantsListPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; statut?: string; purge?: string }>;
}) {
  const session = await requireStaff();
  const { q, statut, purge } = await searchParams;

  const staleThreshold = new Date();
  staleThreshold.setDate(staleThreshold.getDate() - FICHE_FRAICHEUR_SEUIL_JOURS);

  const consultants = await prisma.consultant.findMany({
    where: {
      ...(session.user.role === ROLES.ADMIN
        ? {}
        : { businessManagerId: session.user.id }),
      ...(statut ? { statutPublication: statut } : {}),
      ...(purge ? { dateConservationLimite: { lt: new Date() } } : {}),
      ...(q
        ? {
            OR: [
              { nom: { contains: q } },
              { prenom: { contains: q } },
              { referenceAnonyme: { contains: q } },
              { intitulePoste: { contains: q } },
            ],
          }
        : {}),
    },
    orderBy: { updatedAt: "desc" },
    include: { businessManager: true },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">
            Dossiers de compétences
          </h1>
          <p className="text-sm text-slate-500">
            Vue interne — noms et coordonnées visibles ici uniquement.
            {purge && " Filtré sur les dossiers ayant dépassé leur durée de conservation RGPD."}
          </p>
        </div>
        <Link
          href="/admin/consultants/nouveau"
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
        >
          + Nouveau dossier
        </Link>
      </div>

      <form className="flex flex-wrap gap-2">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Rechercher (nom, référence, poste)…"
          className="w-64 rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-slate-900 focus:outline-none"
        />
        <select
          name="statut"
          defaultValue={statut ?? ""}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-slate-900 focus:outline-none"
        >
          <option value="">Tous les statuts</option>
          {Object.entries(STATUT_PUBLICATION_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100"
        >
          Filtrer
        </button>
      </form>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-2">Référence</th>
              <th className="px-4 py-2">Nom</th>
              <th className="px-4 py-2">Poste</th>
              <th className="px-4 py-2">BM référent</th>
              <th className="px-4 py-2">Statut</th>
              <th className="px-4 py-2">Dernière maj</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {consultants.map((c) => {
              const isStale =
                c.statutPublication === "PUBLIEE" && c.updatedAt < staleThreshold;
              return (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2">
                    <Link
                      href={`/admin/consultants/${c.id}`}
                      className="font-medium text-slate-900 hover:underline"
                    >
                      {c.referenceAnonyme}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-slate-600">
                    {c.prenom} {c.nom}
                  </td>
                  <td className="px-4 py-2 text-slate-600">
                    {c.intitulePoste ?? "—"}
                  </td>
                  <td className="px-4 py-2 text-slate-600">
                    {c.businessManager.name}
                  </td>
                  <td className="px-4 py-2">
                    <StatusBadge statut={c.statutPublication} />
                  </td>
                  <td className="px-4 py-2 text-slate-500">
                    <span className={isStale ? "text-amber-700 font-medium" : ""}>
                      {new Date(c.updatedAt).toLocaleDateString("fr-FR")}
                      {isStale ? " · à actualiser" : ""}
                    </span>
                  </td>
                </tr>
              );
            })}
            {consultants.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                  Aucun dossier trouvé.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusBadge({ statut }: { statut: string }) {
  const styles: Record<string, string> = {
    BROUILLON: "bg-slate-100 text-slate-600",
    PUBLIEE: "bg-emerald-50 text-emerald-700",
    DEPUBLIEE: "bg-amber-50 text-amber-700",
    ARCHIVEE: "bg-slate-100 text-slate-400",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${styles[statut] ?? ""}`}>
      {STATUT_PUBLICATION_LABELS[statut as keyof typeof STATUT_PUBLICATION_LABELS] ?? statut}
    </span>
  );
}
