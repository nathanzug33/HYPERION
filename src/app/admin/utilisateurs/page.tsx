import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/guards";
import { ROLE_LABELS } from "@/lib/constants";
import { toggleUserActive, resendInvitationAction } from "./actions";
import CreateUserForm from "./create-user-form";
import DeleteUserButton from "./delete-user-button";
import { parseSort, nextSort, buildSortHref } from "@/lib/sort";
import SortableHeader from "@/components/SortableHeader";

export const dynamic = "force-dynamic";

const SORT_KEYS = ["nom", "email", "role", "org", "connexion", "statut"] as const;

export default async function UtilisateursPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; error?: string; success?: string }>;
}) {
  const session = await requireAdmin();
  const { sort, error, success } = await searchParams;

  const sortState = parseSort(sort, SORT_KEYS);
  const hrefFor = (key: string) => buildSortHref("/admin/utilisateurs", {}, nextSort(key, sortState));

  const [users, organizations] = await Promise.all([
    prisma.user.findMany({
      orderBy:
        sortState.key === "nom"
          ? { name: sortState.dir }
          : sortState.key === "email"
            ? { email: sortState.dir }
            : sortState.key === "role"
              ? { role: sortState.dir }
              : sortState.key === "org"
                ? { clientOrganization: { name: sortState.dir } }
                : sortState.key === "connexion"
                  ? { lastLoginAt: sortState.dir }
                  : sortState.key === "statut"
                    ? { active: sortState.dir }
                    : { createdAt: "desc" },
      include: { clientOrganization: true },
    }),
    prisma.clientOrganization.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-brand-ink">Utilisateurs</h1>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3.5 text-sm text-red-800 shadow-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-xl border border-brand-green/30 bg-brand-green/10 px-4 py-3.5 text-sm text-brand-green shadow-sm">
          {success}
        </div>
      )}

      <CreateUserForm organizations={organizations} />

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-100 bg-brand-blue-bg-soft text-left text-xs font-semibold uppercase tracking-wide text-brand-gray">
            <tr>
              <th className="px-4 py-2">
                <SortableHeader label="Nom" sortKey="nom" current={sortState} href={hrefFor("nom")} />
              </th>
              <th className="px-4 py-2">
                <SortableHeader label="Email" sortKey="email" current={sortState} href={hrefFor("email")} />
              </th>
              <th className="px-4 py-2">
                <SortableHeader label="Rôle" sortKey="role" current={sortState} href={hrefFor("role")} />
              </th>
              <th className="px-4 py-2">
                <SortableHeader label="Organisation" sortKey="org" current={sortState} href={hrefFor("org")} />
              </th>
              <th className="px-4 py-2">
                <SortableHeader
                  label="Dernière connexion"
                  sortKey="connexion"
                  current={sortState}
                  href={hrefFor("connexion")}
                />
              </th>
              <th className="px-4 py-2">
                <SortableHeader label="Statut" sortKey="statut" current={sortState} href={hrefFor("statut")} />
              </th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((u) => (
              <tr key={u.id} className="transition-colors hover:bg-brand-blue-bg-soft">
                <td className="px-4 py-2 font-medium text-brand-ink">{u.name}</td>
                <td className="px-4 py-2 text-brand-body">{u.email}</td>
                <td className="px-4 py-2 text-brand-body">
                  {ROLE_LABELS[u.role as keyof typeof ROLE_LABELS] ?? u.role}
                </td>
                <td className="px-4 py-2 text-brand-body">
                  {u.clientOrganization?.name ?? "—"}
                </td>
                <td className="px-4 py-2 text-brand-gray">
                  {u.lastLoginAt
                    ? new Date(u.lastLoginAt).toLocaleString("fr-FR")
                    : "Jamais connecté"}
                </td>
                <td className="px-4 py-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      u.active
                        ? "bg-brand-green/10 text-brand-green"
                        : "bg-slate-100 text-brand-gray"
                    }`}
                  >
                    {u.active ? "Actif" : "Désactivé"}
                  </span>
                </td>
                <td className="px-4 py-2 text-right">
                  <div className="flex items-center justify-end gap-3">
                    {!u.lastLoginAt && (
                      <form action={resendInvitationAction}>
                        <input type="hidden" name="id" value={u.id} />
                        <button
                          type="submit"
                          className="link-underline text-xs text-brand-blue-dark hover:text-brand-ink"
                        >
                          Renvoyer l&apos;invitation
                        </button>
                      </form>
                    )}
                    <form action={toggleUserActive}>
                      <input type="hidden" name="id" value={u.id} />
                      <input type="hidden" name="active" value={String(u.active)} />
                      <button
                        type="submit"
                        className="link-underline text-xs text-brand-gray hover:text-brand-ink"
                      >
                        {u.active ? "Révoquer l'accès" : "Réactiver"}
                      </button>
                    </form>
                    {u.id !== session.user.id && <DeleteUserButton id={u.id} name={u.name} />}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
