import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/guards";
import { ROLES } from "@/lib/constants";
import StatusSelect from "./status-select";

export const dynamic = "force-dynamic";

export default async function DemandesPage() {
  const session = await requireStaff();

  const requests = await prisma.contactRequest.findMany({
    where:
      session.user.role === ROLES.ADMIN
        ? {}
        : { consultant: { businessManagerId: session.user.id } },
    orderBy: { createdAt: "desc" },
    include: { consultant: true, clientUser: { include: { clientOrganization: true } } },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">
          Demandes de contact
        </h1>
        <p className="text-sm text-slate-500">
          Suivi commercial des demandes générées par la bibliothèque.
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-2">Date</th>
              <th className="px-4 py-2">Profil</th>
              <th className="px-4 py-2">Client</th>
              <th className="px-4 py-2">Besoin</th>
              <th className="px-4 py-2">Démarrage souhaité</th>
              <th className="px-4 py-2">Statut</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {requests.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-2 text-slate-500 whitespace-nowrap">
                  {new Date(r.createdAt).toLocaleString("fr-FR")}
                </td>
                <td className="px-4 py-2 font-mono text-slate-700">
                  {r.consultant.referenceAnonyme}
                </td>
                <td className="px-4 py-2 text-slate-600">
                  {r.clientUser.name}
                  {r.clientUser.clientOrganization && (
                    <div className="text-xs text-slate-400">
                      {r.clientUser.clientOrganization.name}
                    </div>
                  )}
                </td>
                <td className="px-4 py-2 max-w-xs text-slate-600">
                  <div className="line-clamp-2">{r.besoin}</div>
                  {r.localisation && (
                    <div className="text-xs text-slate-400">{r.localisation}</div>
                  )}
                </td>
                <td className="px-4 py-2 text-slate-500 whitespace-nowrap">
                  {r.dateDemarrageSouhaitee
                    ? new Date(r.dateDemarrageSouhaitee).toLocaleDateString("fr-FR")
                    : "—"}
                </td>
                <td className="px-4 py-2">
                  <StatusSelect id={r.id} status={r.status} />
                </td>
              </tr>
            ))}
            {requests.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                  Aucune demande pour le moment.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
