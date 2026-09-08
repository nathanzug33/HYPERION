import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireClient } from "@/lib/guards";
import { CONTACT_REQUEST_STATUS_LABELS } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function DemandesClientPage({
  searchParams,
}: {
  searchParams: Promise<{ envoye?: string }>;
}) {
  const session = await requireClient();
  const { envoye } = await searchParams;

  const [contactRequests, demandesBesoin] = await Promise.all([
    prisma.contactRequest.findMany({
      where: { clientUserId: session.user.id },
      orderBy: { createdAt: "desc" },
      include: { consultant: { select: { referenceAnonyme: true, intitulePoste: true } } },
    }),
    prisma.demandeBesoin.findMany({
      where: { clientUserId: session.user.id },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  type DemandeMerged = {
    id: string;
    kind: "profil" | "besoin";
    titre: string;
    detail: string;
    status: string;
    createdAt: Date;
  };

  const demandes: DemandeMerged[] = [
    ...contactRequests.map((d) => ({
      id: d.id,
      kind: "profil" as const,
      titre: `${d.consultant.referenceAnonyme} — ${d.consultant.intitulePoste ?? "profil"}`,
      detail: d.besoin,
      status: d.status,
      createdAt: d.createdAt,
    })),
    ...demandesBesoin.map((d) => ({
      id: d.id,
      kind: "besoin" as const,
      titre: d.intitulePoste,
      detail: d.descriptifPoste,
      status: d.status,
      createdAt: d.createdAt,
    })),
  ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-brand-ink">Mes demandes</h1>
          <p className="mt-1 text-sm text-brand-gray">
            Demandes envoyées sur un profil précis ou décrites librement.
          </p>
        </div>
        <Link href="/bibliotheque/demandes/nouvelle" className="btn btn-primary">
          + Décrire un besoin
        </Link>
      </div>

      {envoye && (
        <div className="rounded-xl border border-brand-blue-light/40 bg-brand-blue-bg px-4 py-3 text-sm text-brand-ink">
          Votre demande a bien été envoyée. Votre business manager reviendra
          vers vous rapidement.
        </div>
      )}

      {demandes.length === 0 ? (
        <div className="card border-dashed p-10 text-center">
          <p className="text-brand-body">Vous n&apos;avez pas encore envoyé de demande.</p>
          <p className="mt-1 text-sm text-brand-gray">
            Trouvez un profil dans la bibliothèque, ou décrivez directement
            votre besoin si vous n&apos;avez pas encore de candidat en tête.
          </p>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100 bg-brand-blue-bg-soft text-left text-xs font-semibold uppercase tracking-wide text-brand-gray">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Objet</th>
                <th className="px-4 py-3">Détail</th>
                <th className="px-4 py-3">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {demandes.map((d) => (
                <tr key={`${d.kind}-${d.id}`} className="transition-colors hover:bg-brand-blue-bg-soft">
                  <td className="px-4 py-3 text-brand-gray whitespace-nowrap">
                    {new Date(d.createdAt).toLocaleDateString("fr-FR")}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-brand-body">
                      {d.kind === "profil" ? "Profil ciblé" : "Besoin libre"}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium text-brand-ink">{d.titre}</td>
                  <td className="px-4 py-3 max-w-sm text-brand-body">
                    <div className="line-clamp-2">{d.detail}</div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={d.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    NOUVELLE: "bg-brand-blue-bg text-brand-blue-dark",
    EN_COURS: "bg-amber-50 text-amber-700",
    TRAITEE: "bg-brand-green/10 text-brand-green",
    SANS_SUITE: "bg-slate-100 text-brand-gray",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${styles[status] ?? ""}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
      {CONTACT_REQUEST_STATUS_LABELS[status as keyof typeof CONTACT_REQUEST_STATUS_LABELS] ?? status}
    </span>
  );
}
