import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/guards";
import {
  STATUT_PUBLICATION_LABELS,
  FICHE_FRAICHEUR_SEUIL_JOURS,
} from "@/lib/constants";
import { consultantVisibilityWhere } from "@/lib/consultant-access";

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
      AND: [
        consultantVisibilityWhere(session.user),
        statut ? { statutPublication: statut } : {},
        purge ? { dateConservationLimite: { lt: new Date() } } : {},
        q
          ? {
              OR: [
                { nom: { contains: q } },
                { prenom: { contains: q } },
                { referenceAnonyme: { contains: q } },
                { intitulePoste: { contains: q } },
                { sourceCvTexte: { contains: q } },
                { notesEntretien: { contains: q } },
                { resumeContexte: { contains: q } },
              ],
            }
          : {},
      ],
    },
    orderBy: { updatedAt: "desc" },
    include: { businessManager: true },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-brand-ink">
            Candidats (ATS)
          </h1>
          <p className="mt-1 text-sm text-brand-gray">
            Vivier commun à toutes les agences — noms et coordonnées visibles
            ici uniquement. Un candidat devient un « dossier de compétences »
            visible des clients une fois publié depuis sa fiche.
            {purge && " Filtré sur les dossiers ayant dépassé leur durée de conservation RGPD."}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/consultants/recherche" className="btn btn-secondary">
            🔍 Recherche avancée
          </Link>
          {/* Route Handler (téléchargement CSV), pas une page : <a> volontaire pour forcer une navigation complète. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href="/admin/consultants/export/vivier" className="btn btn-secondary">
            ⬇️ Export CSV
          </a>
          <Link href="/admin/consultants/nouveau" className="btn btn-secondary">
            + Ajouter un candidat
          </Link>
          <Link href="/admin/consultants/generer-ia" className="btn btn-primary">
            ✨ Générer avec l&apos;IA
          </Link>
        </div>
      </div>

      <form className="card flex flex-wrap items-center gap-2 p-3">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Rechercher (nom, référence, poste, contenu du CV…)"
          className="input w-64"
        />
        <select name="statut" defaultValue={statut ?? ""} className="input w-auto">
          <option value="">Tous les statuts</option>
          {Object.entries(STATUT_PUBLICATION_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <button type="submit" className="btn btn-secondary">
          Filtrer
        </button>
      </form>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-100 bg-brand-blue-bg-soft text-left text-xs font-semibold uppercase tracking-wide text-brand-gray">
            <tr>
              <th className="px-4 py-3">Référence</th>
              <th className="px-4 py-3">Nom</th>
              <th className="px-4 py-3">Poste</th>
              <th className="px-4 py-3">BM référent</th>
              <th className="px-4 py-3">Statut</th>
              <th className="px-4 py-3">Dernière maj</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {consultants.map((c) => {
              const isStale =
                c.statutPublication === "PUBLIEE" && c.updatedAt < staleThreshold;
              return (
                <tr key={c.id} className="transition-colors hover:bg-brand-blue-bg-soft">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/consultants/${c.id}`}
                      className="font-mono text-sm font-medium text-brand-ink hover:text-brand-blue-dark"
                    >
                      {c.referenceAnonyme}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-brand-body">
                    {c.prenom} {c.nom}
                  </td>
                  <td className="px-4 py-3 text-brand-body">
                    {c.intitulePoste ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-brand-body">{c.businessManager.name}</td>
                  <td className="px-4 py-3">
                    <StatusBadge statut={c.statutPublication} />
                  </td>
                  <td className="px-4 py-3 text-brand-gray">
                    <span className={isStale ? "font-medium text-amber-700" : ""}>
                      {new Date(c.updatedAt).toLocaleDateString("fr-FR")}
                      {isStale ? " · à actualiser" : ""}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right">
                    <Link
                      href={`/admin/consultants/${c.id}/apercu`}
                      className="link-underline text-sm text-brand-blue-dark"
                    >
                      Aperçu
                    </Link>
                    <span className="mx-1.5 text-slate-300">·</span>
                    <Link
                      href={`/admin/consultants/${c.id}`}
                      className="link-underline text-sm text-brand-body hover:text-brand-ink"
                    >
                      Modifier
                    </Link>
                  </td>
                </tr>
              );
            })}
            {consultants.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-brand-gray">
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
    PUBLIEE: "bg-brand-green/10 text-brand-green",
    DEPUBLIEE: "bg-amber-50 text-amber-700",
    ARCHIVEE: "bg-slate-100 text-brand-gray",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${styles[statut] ?? ""}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
      {STATUT_PUBLICATION_LABELS[statut as keyof typeof STATUT_PUBLICATION_LABELS] ?? statut}
    </span>
  );
}
