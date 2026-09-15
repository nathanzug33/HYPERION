import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/guards";
import {
  ROLES,
  STATUT_ENTREPRISE_LABELS,
  canReassignReferent,
  formatSecteurActivite,
} from "@/lib/constants";
import { entrepriseVisibilityWhere } from "@/lib/crm-access";
import { parseSort, nextSort, buildSortHref } from "@/lib/sort";
import SortableHeader from "@/components/SortableHeader";
import type { Prisma } from "@prisma/client";

const SORT_KEYS = ["nom", "secteur", "ville", "contacts", "bm", "statut", "maj"] as const;

export const dynamic = "force-dynamic";

export default async function CrmListPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    statut?: string;
    ville?: string;
    businessManagerId?: string;
    sort?: string;
  }>;
}) {
  const session = await requireStaff();
  const { q, statut, ville, businessManagerId, sort } = await searchParams;
  const peutFiltrerParBm = canReassignReferent(session.user);

  // Tri par colonne — cycle A→Z / Z→A / tri par défaut (dernière mise à
  // jour) au clic sur l'en-tête.
  const sortState = parseSort(sort, SORT_KEYS);
  const baseParams = { q, ville, statut, businessManagerId };
  const hrefFor = (key: string) => buildSortHref("/admin/crm", baseParams, nextSort(key, sortState));

  const where: Prisma.EntrepriseWhereInput = {
    AND: [
      entrepriseVisibilityWhere(session.user),
      statut ? { statutCommercial: statut } : {},
      ville ? { ville: { contains: ville, mode: "insensitive" } } : {},
      peutFiltrerParBm && businessManagerId ? { businessManagerId } : {},
      q
        ? {
            OR: [
              { nom: { contains: q, mode: "insensitive" } },
              { industrie: { label: { contains: q, mode: "insensitive" } } },
              { ville: { contains: q, mode: "insensitive" } },
              { notes: { contains: q, mode: "insensitive" } },
              { contacts: { some: { nom: { contains: q, mode: "insensitive" } } } },
              { contacts: { some: { prenom: { contains: q, mode: "insensitive" } } } },
              { contacts: { some: { fonction: { contains: q, mode: "insensitive" } } } },
            ],
          }
        : {},
    ],
  };

  const [entreprises, bms] = await Promise.all([
    prisma.entreprise.findMany({
      where,
      orderBy:
        sortState.key === "nom"
          ? { nom: sortState.dir }
          : sortState.key === "secteur"
            ? { industrie: { label: sortState.dir } }
            : sortState.key === "ville"
              ? { ville: sortState.dir }
              : sortState.key === "contacts"
                ? { contacts: { _count: sortState.dir } }
                : sortState.key === "bm"
                  ? { businessManager: { name: sortState.dir } }
                  : sortState.key === "statut"
                    ? { statutCommercial: sortState.dir }
                    : sortState.key === "maj"
                      ? { updatedAt: sortState.dir }
                      : { updatedAt: "desc" },
      include: {
        businessManager: true,
        industrie: true,
        _count: { select: { contacts: true } },
      },
    }),
    peutFiltrerParBm
      ? prisma.user.findMany({ where: { role: ROLES.BM, active: true }, orderBy: { name: "asc" } })
      : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-brand-ink">CRM — Entreprises</h1>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/crm/besoins" className="btn btn-secondary">
            📋 Bibliothèque des besoins
          </Link>
          {/* Route Handler (téléchargement CSV), pas une page : <a> volontaire pour forcer une navigation complète. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href="/admin/crm/export/pipeline" className="btn btn-secondary">
            ⬇️ Export CSV
          </a>
          <Link href="/admin/crm/importer" className="btn btn-secondary">
            📥 Importer (Excel)
          </Link>
          <Link href="/admin/crm/nouvelle" className="btn btn-primary">
            + Ajouter une entreprise
          </Link>
        </div>
      </div>

      <form className="card flex flex-wrap items-center gap-2 p-3">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Rechercher (entreprise, secteur, ville, contact…)"
          className="input w-64"
        />
        <input
          type="text"
          name="ville"
          defaultValue={ville}
          placeholder="Ville"
          className="input w-36"
        />
        <select name="statut" defaultValue={statut ?? ""} className="input w-auto">
          <option value="">Tous les statuts</option>
          {Object.entries(STATUT_ENTREPRISE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        {peutFiltrerParBm && (
          <select name="businessManagerId" defaultValue={businessManagerId ?? ""} className="input w-auto">
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

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-100 bg-brand-blue-bg-soft text-left text-xs font-semibold uppercase tracking-wide text-brand-gray">
            <tr>
              <th className="px-4 py-3">
                <SortableHeader label="Entreprise" sortKey="nom" current={sortState} href={hrefFor("nom")} />
              </th>
              <th className="px-4 py-3">
                <SortableHeader label="Secteur" sortKey="secteur" current={sortState} href={hrefFor("secteur")} />
              </th>
              <th className="px-4 py-3">
                <SortableHeader label="Ville" sortKey="ville" current={sortState} href={hrefFor("ville")} />
              </th>
              <th className="px-4 py-3">
                <SortableHeader label="Contacts" sortKey="contacts" current={sortState} href={hrefFor("contacts")} />
              </th>
              <th className="px-4 py-3">
                <SortableHeader label="BM référent" sortKey="bm" current={sortState} href={hrefFor("bm")} />
              </th>
              <th className="px-4 py-3">
                <SortableHeader label="Statut" sortKey="statut" current={sortState} href={hrefFor("statut")} />
              </th>
              <th className="px-4 py-3">
                <SortableHeader label="Dernière maj" sortKey="maj" current={sortState} href={hrefFor("maj")} />
              </th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {entreprises.map((e) => (
              <tr key={e.id} className="transition-colors hover:bg-brand-blue-bg-soft">
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/crm/${e.id}`}
                    className="font-medium text-brand-ink hover:text-brand-blue-dark"
                  >
                    {e.nom}
                  </Link>
                </td>
                <td className="px-4 py-3 text-brand-body">
                  {formatSecteurActivite(e.secteurCategorie, e.industrie?.label) || "—"}
                </td>
                <td className="px-4 py-3 text-brand-body">{e.ville ?? "—"}</td>
                <td className="px-4 py-3 text-brand-body">{e._count.contacts}</td>
                <td className="px-4 py-3 text-brand-body">{e.businessManager.name}</td>
                <td className="px-4 py-3">
                  <StatutBadge statut={e.statutCommercial} />
                </td>
                <td className="px-4 py-3 text-brand-gray">
                  {new Date(e.updatedAt).toLocaleDateString("fr-FR")}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-right">
                  <Link
                    href={`/admin/crm/${e.id}`}
                    className="link-underline text-sm text-brand-blue-dark"
                  >
                    Ouvrir
                  </Link>
                </td>
              </tr>
            ))}
            {entreprises.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-brand-gray">
                  Aucune entreprise trouvée.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatutBadge({ statut }: { statut: string }) {
  const styles: Record<string, string> = {
    PROSPECT: "bg-slate-100 text-brand-body",
    EN_COURS: "bg-brand-blue-bg text-brand-blue-dark",
    CLIENT: "bg-brand-green/10 text-brand-green",
    PERDU: "bg-red-50 text-red-700",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${styles[statut] ?? ""}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
      {STATUT_ENTREPRISE_LABELS[statut as keyof typeof STATUT_ENTREPRISE_LABELS] ?? statut}
    </span>
  );
}
