import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/guards";
import { consultantVisibilityWhere } from "@/lib/consultant-access";
import StatusSelect from "./status-select";
import { repondreContactRequestAction, repondreDemandeBesoinAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function DemandesPage() {
  const session = await requireStaff();

  const [requests, demandesBesoin] = await Promise.all([
    prisma.contactRequest.findMany({
      where: { consultant: consultantVisibilityWhere(session.user) },
      orderBy: { createdAt: "desc" },
      include: {
        consultant: true,
        clientUser: { include: { clientOrganization: true } },
        reponduPar: { select: { name: true } },
      },
    }),
    // Pas rattachées à un consultant/BM référent : visibles par tout le
    // back-office (admin + BM), jusqu'à ce qu'un profil soit identifié.
    prisma.demandeBesoin.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        clientUser: { include: { clientOrganization: true } },
        reponduPar: { select: { name: true } },
      },
    }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-brand-ink">Demandes</h1>
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
                <th className="px-4 py-3">Réponse</th>
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
                  <td className="px-4 py-2 min-w-[16rem]">
                    <ReponseCell
                      id={r.id}
                      reponseNote={r.reponseNote}
                      reponduLe={r.reponduLe}
                      reponduParNom={r.reponduPar?.name ?? null}
                      action={repondreContactRequestAction}
                    />
                  </td>
                </tr>
              ))}
              {requests.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-brand-gray">
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
                <th className="px-4 py-3">Réponse</th>
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
                  <td className="px-4 py-2 min-w-[16rem]">
                    <ReponseCell
                      id={d.id}
                      reponseNote={d.reponseNote}
                      reponduLe={d.reponduLe}
                      reponduParNom={d.reponduPar?.name ?? null}
                      action={repondreDemandeBesoinAction}
                    />
                  </td>
                </tr>
              ))}
              {demandesBesoin.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-brand-gray">
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

/** Réponse visible par le client sur sa fiche « Mes demandes » — formulaire
 * de saisie tant qu'aucune réponse n'a été laissée, puis affichage en lecture
 * seule. Formulaire natif (server action), pas de JS requis. */
function ReponseCell({
  id,
  reponseNote,
  reponduLe,
  reponduParNom,
  action,
}: {
  id: string;
  reponseNote: string | null;
  reponduLe: Date | null;
  reponduParNom: string | null;
  action: (formData: FormData) => void | Promise<void>;
}) {
  if (reponseNote) {
    return (
      <div className="text-xs text-brand-body">
        <p className="whitespace-pre-line">{reponseNote}</p>
        <p className="mt-1 text-brand-gray">
          {reponduParNom}
          {reponduLe && `, ${new Date(reponduLe).toLocaleDateString("fr-FR")}`}
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="flex items-start gap-1.5">
      <input type="hidden" name="id" value={id} />
      <textarea
        name="reponseNote"
        required
        rows={2}
        placeholder="Répondre au client (visible sur son espace)…"
        className="input py-1.5 text-xs"
      />
      <button type="submit" className="btn btn-secondary shrink-0 py-1.5 text-xs">
        Envoyer
      </button>
    </form>
  );
}
