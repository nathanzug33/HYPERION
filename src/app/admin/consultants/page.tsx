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
          <h1 className="text-xl font-semibold text-brand-ink">
            Dossiers de compétences
          </h1>
          <p className="text-sm text-brand-gray">
            Vue interne — noms et coordonnées visibles ici uniquement.
            {purge && " Filtré sur les dossiers ayant dépassé leur durée de conservation RGPD."}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/consultants/nouveau"
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-brand-body hover:bg-brand-blue-bg-soft"
          >
            + Saisie manuelle
          </Link>
          <Link
            href="/admin/consultants/generer-ia"
            className="rounded-md bg-brand-ink px-4 py-2 text-sm font-medium text-white hover:bg-brand-blue-dark"
          >
            Générer avec l&apos;IA
          </Link>
        </div>
      </div>

      <form className="flex flex-wrap gap-2">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Rechercher (nom, référence, poste)…"
          className="w-64 rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-brand-blue focus:outline-none"
        />
        <select
          name="statut"
          defaultValue={statut ?? ""}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-brand-blue focus:outline-none"
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
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-brand-blue-bg"
        >
          Filtrer
        </button>
      </form>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-brand-blue-bg-soft text-left text-xs uppercase tracking-wide text-brand-gray">
            <tr>
              <th className="px-4 py-2">Référence</th>
              <th className="px-4 py-2">Nom</th>
              <th className="px-4 py-2">Poste</th>
              <th className="px-4 py-2">BM référent</th>
              <th className="px-4 py-2">Statut</th>
              <th className="px-4 py-2">Dernière maj</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {consultants.map((c) => {
              const isStale =
                c.statutPublication === "PUBLIEE" && c.updatedAt < staleThreshold;
              return (
                <tr key={c.id} className="hover:bg-brand-blue-bg-soft">
                  <td className="px-4 py-2">
                    <Link
                      href={`/admin/consultants/${c.id}`}
                      className="font-medium text-brand-ink hover:underline"
                    >
                      {c.referenceAnonyme}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-brand-body">
                    {c.prenom} {c.nom}
                  </td>
                  <td className="px-4 py-2 text-brand-body">
                    {c.intitulePoste ?? "—"}
                  </td>
                  <td className="px-4 py-2 text-brand-body">
                    {c.businessManager.name}
                  </td>
                  <td className="px-4 py-2">
                    <StatusBadge statut={c.statutPublication} />
                  </td>
                  <td className="px-4 py-2 text-brand-gray">
                    <span className={isStale ? "text-amber-700 font-medium" : ""}>
                      {new Date(c.updatedAt).toLocaleDateString("fr-FR")}
                      {isStale ? " · à actualiser" : ""}
                    </span>
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-right">
                    <Link
                      href={`/admin/consultants/${c.id}/apercu`}
                      className="text-sm text-brand-blue underline hover:text-brand-blue-dark"
                    >
                      Aperçu
                    </Link>
                    <span className="mx-1.5 text-slate-300">·</span>
                    <Link
                      href={`/admin/consultants/${c.id}`}
                      className="text-sm text-brand-body underline hover:text-brand-ink"
                    >
                      Modifier
                    </Link>
                  </td>
                </tr>
              );
            })}
            {consultants.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-brand-gray">
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
    BROUILLON: "bg-slate-100 text-brand-body",
    PUBLIEE: "bg-emerald-50 text-emerald-700",
    DEPUBLIEE: "bg-amber-50 text-amber-700",
    ARCHIVEE: "bg-slate-100 text-brand-gray",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${styles[statut] ?? ""}`}>
      {STATUT_PUBLICATION_LABELS[statut as keyof typeof STATUT_PUBLICATION_LABELS] ?? statut}
    </span>
  );
}
