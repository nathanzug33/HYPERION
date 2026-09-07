import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/guards";
import { ROLE_LABELS } from "@/lib/constants";
import { toggleUserActive } from "./actions";
import CreateUserForm from "./create-user-form";

export const dynamic = "force-dynamic";

export default async function UtilisateursPage() {
  await requireAdmin();

  const [users, organizations] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
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
        <h1 className="text-xl font-semibold text-brand-ink">Utilisateurs</h1>
        <p className="text-sm text-brand-gray">
          Les comptes sont créés uniquement par un administrateur — pas
          d&apos;auto-inscription. Un accès peut être révoqué à tout moment.
        </p>
      </div>

      <CreateUserForm organizations={organizations} />

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-brand-blue-bg-soft text-left text-xs uppercase tracking-wide text-brand-gray">
            <tr>
              <th className="px-4 py-2">Nom</th>
              <th className="px-4 py-2">Email</th>
              <th className="px-4 py-2">Rôle</th>
              <th className="px-4 py-2">Organisation</th>
              <th className="px-4 py-2">Dernière connexion</th>
              <th className="px-4 py-2">Statut</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((u) => (
              <tr key={u.id}>
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
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-slate-100 text-brand-gray"
                    }`}
                  >
                    {u.active ? "Actif" : "Désactivé"}
                  </span>
                </td>
                <td className="px-4 py-2 text-right">
                  <form action={toggleUserActive}>
                    <input type="hidden" name="id" value={u.id} />
                    <input type="hidden" name="active" value={String(u.active)} />
                    <button
                      type="submit"
                      className="text-xs text-brand-gray underline hover:text-brand-ink"
                    >
                      {u.active ? "Révoquer l'accès" : "Réactiver"}
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
