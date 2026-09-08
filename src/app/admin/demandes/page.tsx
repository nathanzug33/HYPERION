import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/guards";
import { consultantVisibilityWhere } from "@/lib/consultant-access";
import StatusSelect from "./status-select";

export const dynamic = "force-dynamic";

export default async function DemandesPage() {
  const session = await requireStaff();

  const [requests, demandesBesoin] = await Promise.all([
    prisma.contactRequest.findMany({
      where: { consultant: consultantVisibilityWhere(session.user) },
      orderBy: { createdAt: "desc" },
      include: { consultant: true, clientUser: { include: { clientOrganization: true } } },
    }),
    // Pas rattachées à un consultant/BM référent : visibles par tout le
    // back-office (admin + BM), jusqu'à ce qu'un profil soit identifié.
    prisma.demandeBesoin.findMany({
      orderBy: { createdAt: "desc" },
      include: { clientUser: { include: { clientOrganization: true } } },
    }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-brand-ink">Demandes</h1>
        <p className="mt-1 text-sm text-brand-gray">
          Suivi commercial des demandes générées par la bibliothèque —
          rattachées à un profil précis ou décrites librement par le client.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-brand-ink">
          Demandes sur profil ({requests.length})
        </h2>
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100 bg-brand-blue-bg-soft text-left text-xs font-semibold uppercase tracking-wide text-brand-gray">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Profil</th>
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3">Besoin</th>
                <th className="px-4 py-3">Démarrage souhaité</th>
                <th className="px-4 py-3">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {requests.map((r) => (
                <tr key={r.id} className="transition-colors hover:bg-brand-blue-bg-soft">
                  <td className="px-4 py-2 text-brand-gray whitespace-nowrap">
                    {new Date(r.createdAt).toLocaleString("fr-FR")}
                  </td>
                  <td className="px-4 py-2 font-mono text-brand-body">
                    {r.consultant.referenceAnonyme}
                  </td>
                  <td className="px-4 py-2 text-brand-body">
                    {r.clientUser.name}
                    {r.clientUser.clientOrganization && (
                      <div className="text-xs text-brand-gray">
                        {r.clientUser.clientOrganization.name}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-2 max-w-xs text-brand-body">
                    <div className="line-clamp-2">{r.besoin}</div>
                    {r.localisation && (
                      <div className="text-xs text-brand-gray">{r.localisation}</div>
                    )}
                  </td>
                  <td className="px-4 py-2 text-brand-gray whitespace-nowrap">
                    {r.dateDemarrageSouhaitee
                      ? new Date(r.dateDemarrageSouhaitee).toLocaleDateString("fr-FR")
                      : "—"}
                  </td>
                  <td className="px-4 py-2">
                    <StatusSelect id={r.id} status={r.status} kind="profil" />
                  </td>
                </tr>
              ))}
              {requests.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-brand-gray">
                    Aucune demande pour le moment.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-brand-ink">
          Demandes de besoin — sans profil ciblé ({demandesBesoin.length})
        </h2>
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100 bg-brand-blue-bg-soft text-left text-xs font-semibold uppercase tracking-wide text-brand-gray">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Poste</th>
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3">Descriptif</th>
                <th className="px-4 py-3">TJM cible</th>
                <th className="px-4 py-3">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {demandesBesoin.map((d) => (
                <tr key={d.id} className="transition-colors hover:bg-brand-blue-bg-soft">
                  <td className="px-4 py-2 text-brand-gray whitespace-nowrap">
                    {new Date(d.createdAt).toLocaleString("fr-FR")}
                  </td>
                  <td className="px-4 py-2 font-medium text-brand-ink">
                    {d.intitulePoste}
                    {d.seniorite && (
                      <div className="text-xs font-normal text-brand-gray">{d.seniorite}</div>
                    )}
                  </td>
                  <td className="px-4 py-2 text-brand-body">
                    {d.clientUser.name}
                    {d.clientUser.clientOrganization && (
                      <div className="text-xs text-brand-gray">
                        {d.clientUser.clientOrganization.name}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-2 max-w-xs text-brand-body">
                    <div className="line-clamp-2">{d.descriptifPoste}</div>
                    {d.localisation && (
                      <div className="text-xs text-brand-gray">{d.localisation}</div>
                    )}
                  </td>
                  <td className="px-4 py-2 text-brand-gray whitespace-nowrap">
                    {d.tjmCibleMin || d.tjmCibleMax
                      ? `${d.tjmCibleMin ?? "?"}–${d.tjmCibleMax ?? "?"} €`
                      : "—"}
                  </td>
                  <td className="px-4 py-2">
                    <StatusSelect id={d.id} status={d.status} kind="besoin" />
                  </td>
                </tr>
              ))}
              {demandesBesoin.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-brand-gray">
                    Aucune demande de besoin pour le moment.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
