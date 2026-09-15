import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/guards";
import {
  STATUT_PUBLICATION_LABELS,
  FICHE_FRAICHEUR_SEUIL_JOURS,
  formatStatutBibliotheque,
} from "@/lib/constants";
import { consultantVisibilityWhere } from "@/lib/consultant-access";
import { parseSort, nextSort, buildSortHref } from "@/lib/sort";
import SortableHeader from "@/components/SortableHeader";
import NouveauCandidatPopover from "./nouveau-popover";
import ConsultantQuickEditPopover from "./quick-edit-popover";

export const dynamic = "force-dynamic";

const SORT_KEYS = ["ref", "nom", "poste", "bm", "bibliotheque", "completude", "maj"] as const;

export default async function ConsultantsListPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; statut?: string; purge?: string; sort?: string }>;
}) {
  const session = await requireStaff();
  const { q, statut, purge, sort } = await searchParams;

  const staleThreshold = new Date();
  staleThreshold.setDate(staleThreshold.getDate() - FICHE_FRAICHEUR_SEUIL_JOURS);

  // Tri par colonne — cycle A→Z / Z→A / tri par défaut (dernière mise à
  // jour) au clic sur l'en-tête. La complétude est calculée (pas stockée en
  // base), donc triée côté JS après récupération de la liste.
  const sortState = parseSort(sort, SORT_KEYS);
  const baseParams = { q, statut, purge };
  const hrefFor = (key: string) =>
    buildSortHref("/admin/consultants", baseParams, nextSort(key, sortState));

  const consultantsBruts = await prisma.consultant.findMany({
    where: {
      AND: [
        consultantVisibilityWhere(session.user),
        statut ? { statutPublication: statut } : {},
        purge ? { dateConservationLimite: { lt: new Date() } } : {},
        q
          ? {
              OR: [
                { nom: { contains: q, mode: "insensitive" } },
                { prenom: { contains: q, mode: "insensitive" } },
                { referenceAnonyme: { contains: q, mode: "insensitive" } },
                { intitulePoste: { contains: q, mode: "insensitive" } },
                { sourceCvTexte: { contains: q, mode: "insensitive" } },
                { notesEntretien: { contains: q, mode: "insensitive" } },
                { resumeContexte: { contains: q, mode: "insensitive" } },
              ],
            }
          : {},
      ],
    },
    orderBy:
      sortState.key === "ref"
        ? { referenceAnonyme: sortState.dir }
        : sortState.key === "nom"
          ? [{ nom: sortState.dir }, { prenom: sortState.dir }]
          : sortState.key === "poste"
            ? { intitulePoste: sortState.dir }
            : sortState.key === "bm"
              ? { businessManager: { name: sortState.dir } }
              : sortState.key === "bibliotheque"
                ? { statutPublication: sortState.dir }
                : sortState.key === "maj"
                  ? { updatedAt: sortState.dir }
                  : { updatedAt: "desc" },
    include: {
      businessManager: true,
      _count: { select: { secteurs: true, expertises: true, langues: true } },
    },
  });

  const consultants =
    sortState.key === "completude"
      ? [...consultantsBruts].sort((a, b) => {
          const diff = computeCompletude(a) - computeCompletude(b);
          return sortState.dir === "asc" ? diff : -diff;
        })
      : consultantsBruts;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-brand-ink">
            Candidats (ATS)
          </h1>
          {purge && (
            <p className="mt-1 text-sm text-brand-gray">
              Filtré sur les dossiers ayant dépassé leur durée de conservation RGPD.
            </p>
          )}
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
          <NouveauCandidatPopover />
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
              <th className="px-4 py-3">
                <SortableHeader label="Référence" sortKey="ref" current={sortState} href={hrefFor("ref")} />
              </th>
              <th className="px-4 py-3">
                <SortableHeader label="Nom" sortKey="nom" current={sortState} href={hrefFor("nom")} />
              </th>
              <th className="px-4 py-3">
                <SortableHeader label="Poste" sortKey="poste" current={sortState} href={hrefFor("poste")} />
              </th>
              <th className="px-4 py-3">
                <SortableHeader label="BM référent" sortKey="bm" current={sortState} href={hrefFor("bm")} />
              </th>
              <th className="px-4 py-3">
                <SortableHeader
                  label="Bibliothèque"
                  sortKey="bibliotheque"
                  current={sortState}
                  href={hrefFor("bibliotheque")}
                />
              </th>
              <th className="px-4 py-3">
                <SortableHeader
                  label="Complétude"
                  sortKey="completude"
                  current={sortState}
                  href={hrefFor("completude")}
                />
              </th>
              <th className="px-4 py-3">
                <SortableHeader label="Dernière maj" sortKey="maj" current={sortState} href={hrefFor("maj")} />
              </th>
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
                  <td className="px-4 py-3">
                    <CompletudeBadge pct={computeCompletude(c)} />
                  </td>
                  <td className="px-4 py-3 text-brand-gray">
                    <span className={isStale ? "font-medium text-amber-700" : ""}>
                      {new Date(c.updatedAt).toLocaleDateString("fr-FR")}
                      {isStale ? " · à actualiser" : ""}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right">
                    <span className="mr-1.5">
                      <ConsultantQuickEditPopover consultant={c} />
                    </span>
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
                <td colSpan={8} className="px-4 py-10 text-center text-brand-gray">
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

// Complétude du dossier : aide à prioriser l'enrichissement des dossiers
// brouillon (§ CVthèque qu'on enrichit en continu) — pas un critère de
// publication, juste un indicateur visuel sur la liste.
function computeCompletude(c: {
  cvFileUrl: string | null;
  anneesExperience: number | null;
  disponibilite: string | null;
  resumeContexte: string | null;
  natureContrat: string | null;
  salaireBrutAnnuel: number | null;
  tjmAchat: number | null;
  _count: { secteurs: number; expertises: number; langues: number };
}): number {
  const criteres = [
    Boolean(c.cvFileUrl),
    c._count.secteurs > 0,
    c._count.expertises > 0,
    c.anneesExperience != null,
    Boolean(c.disponibilite),
    Boolean(c.resumeContexte),
    c._count.langues > 0,
    Boolean(c.natureContrat && (c.salaireBrutAnnuel != null || c.tjmAchat != null)),
  ];
  return Math.round((criteres.filter(Boolean).length / criteres.length) * 100);
}

function CompletudeBadge({ pct }: { pct: number }) {
  const color = pct >= 80 ? "bg-brand-green" : pct >= 50 ? "bg-amber-500" : "bg-red-400";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-brand-gray">{pct}%</span>
    </div>
  );
}

function StatusBadge({ statut }: { statut: string }) {
  const label = formatStatutBibliotheque(statut);
  // Non publié (brouillon) : le dossier est déjà pleinement dans le vivier
  // ATS, rien à signaler ici — le badge n'a de sens que pour distinguer
  // Publié / Dépublié / Archivé.
  if (!label) return <span className="text-brand-gray">—</span>;

  const styles: Record<string, string> = {
    PUBLIEE: "bg-brand-green/10 text-brand-green",
    DEPUBLIEE: "bg-amber-50 text-amber-700",
    ARCHIVEE: "bg-slate-100 text-brand-gray",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${styles[statut] ?? ""}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
      {label}
    </span>
  );
}
