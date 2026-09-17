import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/guards";
import { ROLES, STATUT_ENTREPRISE_LABELS, canReassignReferent } from "@/lib/constants";
import { entrepriseVisibilityWhere } from "@/lib/crm-access";
import { parseSort, nextSort, buildSortHref } from "@/lib/sort";
import SortableHeader from "@/components/SortableHeader";
import SaveListButton from "@/components/SaveListButton";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

const SORT_KEYS = ["nom", "entreprise", "fonction", "telephone", "statut", "bm"] as const;

// Vue transverse : jusqu'ici les interlocuteurs n'étaient consultables que
// dossier par dossier, sur la fiche de chaque entreprise — impossible de
// répondre à "je veux tous les contacts où j'ai un numéro, tous clients
// confondus". Cette page les liste tous à plat, filtrables.
export default async function CrmContactsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    telephone?: string;
    statut?: string;
    businessManagerId?: string;
    sort?: string;
  }>;
}) {
  const session = await requireStaff();
  const { q, telephone, statut, businessManagerId, sort } = await searchParams;
  const peutFiltrerParBm = canReassignReferent(session.user);

  const sortState = parseSort(sort, SORT_KEYS);
  const baseParams = { q, telephone, statut, businessManagerId };
  const hrefFor = (key: string) => buildSortHref("/admin/crm/contacts", baseParams, nextSort(key, sortState));

  const where: Prisma.ContactWhereInput = {
    AND: [
      { entreprise: entrepriseVisibilityWhere(session.user) },
      telephone ? { telephone: { not: null } } : {},
      statut ? { entreprise: { statutCommercial: statut } } : {},
      peutFiltrerParBm && businessManagerId ? { entreprise: { businessManagerId } } : {},
      q
        ? {
            OR: [
              { nom: { contains: q, mode: "insensitive" } },
              { prenom: { contains: q, mode: "insensitive" } },
              { fonction: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
              { entreprise: { nom: { contains: q, mode: "insensitive" } } },
            ],
          }
        : {},
    ],
  };

  const [contacts, bms] = await Promise.all([
    prisma.contact.findMany({
      where,
      orderBy:
        sortState.key === "nom"
          ? { nom: sortState.dir }
          : sortState.key === "entreprise"
            ? { entreprise: { nom: sortState.dir } }
            : sortState.key === "fonction"
              ? { fonction: sortState.dir }
              : sortState.key === "telephone"
                ? { telephone: sortState.dir }
                : sortState.key === "statut"
                  ? { entreprise: { statutCommercial: sortState.dir } }
                  : sortState.key === "bm"
                    ? { entreprise: { businessManager: { name: sortState.dir } } }
                    : { updatedAt: "desc" },
      include: { entreprise: { include: { businessManager: true } } },
    }),
    peutFiltrerParBm
      ? prisma.user.findMany({ where: { role: ROLES.BM, active: true }, orderBy: { name: "asc" } })
      : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-brand-ink">CRM — Contacts</h1>
        <p className="mt-1 text-sm text-brand-gray">
          Tous les interlocuteurs, tous dossiers confondus.
        </p>
      </div>

      <form className="card flex flex-wrap items-center gap-2 p-3">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Rechercher (nom, fonction, email, entreprise…)"
          className="input w-64"
        />
        <label className="flex items-center gap-1.5 text-sm text-brand-body">
          <input
            type="checkbox"
            name="telephone"
            value="1"
            defaultChecked={telephone === "1"}
            className="h-4 w-4 rounded border-slate-300 text-brand-blue focus:ring-brand-blue"
          />
          A un numéro de téléphone
        </label>
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
        <SaveListButton scope="CRM_CONTACTS" />
      </form>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-100 bg-brand-blue-bg-soft text-left text-xs font-semibold uppercase tracking-wide text-brand-gray">
            <tr>
              <th className="px-4 py-3">
                <SortableHeader label="Nom" sortKey="nom" current={sortState} href={hrefFor("nom")} />
              </th>
              <th className="px-4 py-3">
                <SortableHeader label="Entreprise" sortKey="entreprise" current={sortState} href={hrefFor("entreprise")} />
              </th>
              <th className="px-4 py-3">
                <SortableHeader label="Fonction" sortKey="fonction" current={sortState} href={hrefFor("fonction")} />
              </th>
              <th className="px-4 py-3">
                <SortableHeader label="Téléphone" sortKey="telephone" current={sortState} href={hrefFor("telephone")} />
              </th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">
                <SortableHeader label="Statut" sortKey="statut" current={sortState} href={hrefFor("statut")} />
              </th>
              <th className="px-4 py-3">
                <SortableHeader label="BM référent" sortKey="bm" current={sortState} href={hrefFor("bm")} />
              </th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {contacts.map((c) => (
              <tr key={c.id} className="transition-colors hover:bg-brand-blue-bg-soft">
                <td className="px-4 py-3 font-medium text-brand-ink">
                  {c.prenom} {c.nom}
                </td>
                <td className="px-4 py-3 text-brand-body">
                  <Link
                    href={`/admin/crm/${c.entrepriseId}/contacts/${c.id}`}
                    className="hover:text-brand-blue-dark"
                  >
                    {c.entreprise.nom}
                  </Link>
                </td>
                <td className="px-4 py-3 text-brand-body">{c.fonction ?? "—"}</td>
                <td className="px-4 py-3 text-brand-body">{c.telephone ?? "—"}</td>
                <td className="px-4 py-3 text-brand-body">{c.email ?? "—"}</td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-brand-body">
                    {STATUT_ENTREPRISE_LABELS[
                      c.entreprise.statutCommercial as keyof typeof STATUT_ENTREPRISE_LABELS
                    ] ?? c.entreprise.statutCommercial}
                  </span>
                </td>
                <td className="px-4 py-3 text-brand-body">{c.entreprise.businessManager.name}</td>
                <td className="px-4 py-3 whitespace-nowrap text-right">
                  <Link
                    href={`/admin/crm/${c.entrepriseId}/contacts/${c.id}`}
                    className="link-underline text-sm text-brand-blue-dark"
                  >
                    Ouvrir
                  </Link>
                </td>
              </tr>
            ))}
            {contacts.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-brand-gray">
                  Aucun contact trouvé.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
