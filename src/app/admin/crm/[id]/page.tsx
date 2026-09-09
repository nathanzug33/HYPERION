import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/guards";
import { ROLES, STATUT_ENTREPRISE_LABELS, canReassignReferent } from "@/lib/constants";
import { canAccessEntreprise } from "@/lib/crm-access";
import { computeMatchScore } from "@/lib/matching";
import EntrepriseEditForm from "./entreprise-edit-form";
import EntrepriseInfoModal from "./entreprise-info-modal";
import ContactsSection from "./contacts-section";
import BesoinsSection from "./besoins/besoins-section";
import MatchBadges from "@/components/MatchBadges";
import { deleteEntrepriseAction, transferEntrepriseAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function EntrepriseDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ doublonContact?: string }>;
}) {
  const session = await requireStaff();
  const { id } = await params;
  const { doublonContact } = await searchParams;

  const entreprise = await prisma.entreprise.findUnique({
    where: { id },
    include: {
      businessManager: true,
      secteursRecherches: true,
      expertisesRecherchees: true,
    },
  });

  if (!entreprise) notFound();
  if (!canAccessEntreprise(session.user, entreprise)) {
    redirect("/admin/crm");
  }

  const doublonsContacts = doublonContact
    ? await prisma.contact.findMany({
        where: { id: { in: doublonContact.split(",") } },
        select: { id: true, nom: true, prenom: true },
      })
    : [];

  const [contacts, bms, secteurs, expertises, besoins] = await Promise.all([
    prisma.contact.findMany({
      where: { entrepriseId: id },
      orderBy: [{ principal: "desc" }, { createdAt: "asc" }],
    }),
    canReassignReferent(session.user)
      ? prisma.user.findMany({ where: { role: ROLES.BM, active: true }, orderBy: { name: "asc" } })
      : Promise.resolve([]),
    prisma.secteur.findMany({ where: { active: true }, orderBy: { ordre: "asc" } }),
    prisma.expertise.findMany({ where: { active: true }, orderBy: { ordre: "asc" } }),
    prisma.besoin.findMany({
      where: { entrepriseId: id },
      orderBy: { createdAt: "desc" },
      include: { contact: true, missions: { select: { id: true } } },
    }),
  ]);

  const secteurRechercheIds = entreprise.secteursRecherches.map((s) => s.secteurId);
  const expertiseRechercheIds = entreprise.expertisesRecherchees.map((e) => e.expertiseId);

  const suggestions =
    secteurRechercheIds.length > 0 || expertiseRechercheIds.length > 0
      ? await prisma.consultant.findMany({
          where: {
            statutPublication: "PUBLIEE",
            OR: [
              secteurRechercheIds.length > 0
                ? { secteurs: { some: { secteurId: { in: secteurRechercheIds } } } }
                : undefined,
              expertiseRechercheIds.length > 0
                ? { expertises: { some: { expertiseId: { in: expertiseRechercheIds } } } }
                : undefined,
            ].filter((c): c is NonNullable<typeof c> => Boolean(c)),
          },
          select: {
            id: true,
            referenceAnonyme: true,
            intitulePoste: true,
            villeLat: true,
            villeLng: true,
            rayonKm: true,
            disponibilite: true,
            secteurs: { select: { secteurId: true } },
            expertises: { select: { expertiseId: true } },
          },
        })
      : [];

  const suggestionsAvecScore = suggestions
    .map((c) => ({
      id: c.id,
      referenceAnonyme: c.referenceAnonyme,
      intitulePoste: c.intitulePoste,
      match: computeMatchScore({
        candidatSecteurIds: c.secteurs.map((s) => s.secteurId),
        candidatExpertiseIds: c.expertises.map((e) => e.expertiseId),
        candidatVilleLat: c.villeLat,
        candidatVilleLng: c.villeLng,
        candidatRayonKm: c.rayonKm,
        candidatDisponibilite: c.disponibilite,
        entrepriseSecteurIds: secteurRechercheIds,
        entrepriseExpertiseIds: expertiseRechercheIds,
        entrepriseVille: entreprise.ville,
      }),
    }))
    .sort((a, b) => b.match.score - a.match.score)
    .slice(0, 8);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-brand-ink">{entreprise.nom}</h1>
          <p className="mt-1 text-sm text-brand-gray">
            Statut :{" "}
            <span className="font-medium text-brand-body">
              {STATUT_ENTREPRISE_LABELS[
                entreprise.statutCommercial as keyof typeof STATUT_ENTREPRISE_LABELS
              ] ?? entreprise.statutCommercial}
            </span>
            {" · "}BM référent : {entreprise.businessManager.name}
            {entreprise.ville && ` · ${entreprise.ville}`}
          </p>
        </div>
        <Link href="/admin/crm" className="link-underline text-sm text-brand-gray hover:text-brand-ink">
          ← Retour à la liste
        </Link>
      </div>

      {doublonsContacts.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <p className="font-medium">
            ⚠️ Interlocuteur(s) similaire(s) déjà présent(s) pour cette entreprise :
          </p>
          <ul className="mt-1.5 space-y-0.5">
            {doublonsContacts.map((d) => (
              <li key={d.id}>
                <Link
                  href={`/admin/crm/${id}/contacts/${d.id}`}
                  className="link-underline font-medium"
                >
                  {d.prenom} {d.nom}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="card flex flex-wrap items-center gap-2 p-3">
        <EntrepriseInfoModal triggerLabel="ℹ️ Informations de l'entreprise">
          <EntrepriseEditForm
            entreprise={entreprise}
            bms={bms}
            canReassignReferent={canReassignReferent(session.user)}
            secteurs={secteurs}
            expertises={expertises}
          />
        </EntrepriseInfoModal>
        {canReassignReferent(session.user) && (
          <form
            action={transferEntrepriseAction}
            className={`flex items-center gap-1.5 ${session.user.role === ROLES.ADMIN ? "" : "ml-auto"}`}
          >
            <input type="hidden" name="id" value={id} />
            <select
              name="targetId"
              required
              defaultValue=""
              className="input py-1.5 text-xs"
              title="Transférer ce compte à un autre BM"
            >
              <option value="" disabled>
                Transférer à…
              </option>
              {bms
                .filter((bm) => bm.id !== entreprise.businessManagerId)
                .map((bm) => (
                  <option key={bm.id} value={bm.id}>
                    {bm.name}
                  </option>
                ))}
            </select>
            <button type="submit" className="btn btn-secondary py-1.5 text-xs">
              Transférer
            </button>
          </form>
        )}
        {session.user.role === ROLES.ADMIN && (
          <form action={deleteEntrepriseAction} className="ml-auto">
            <input type="hidden" name="id" value={id} />
            <button
              type="submit"
              className="btn border border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
            >
              Supprimer définitivement
            </button>
          </form>
        )}
      </div>

      {suggestionsAvecScore.length > 0 && (
        <div className="card p-5">
          <h2 className="mb-1 text-sm font-semibold text-brand-ink">
            Suggestions de candidats
          </h2>
          <p className="mb-3 text-xs text-brand-gray">
            Profils publiés correspondant aux secteurs / expertises recherchés par ce client.
          </p>
          <ul className="grid gap-2 sm:grid-cols-2">
            {suggestionsAvecScore.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/admin/consultants/${c.id}`}
                  className="flex flex-col gap-1.5 rounded-lg border border-slate-100 px-3 py-2 text-sm hover:border-brand-blue-light hover:bg-brand-blue-bg-soft"
                >
                  <span>
                    <span className="font-mono text-xs text-brand-gray">{c.referenceAnonyme}</span>
                    {c.intitulePoste && <span className="ml-2 text-brand-body">{c.intitulePoste}</span>}
                  </span>
                  <MatchBadges match={c.match} />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <BesoinsSection entrepriseId={id} contacts={contacts} besoins={besoins} />

      <ContactsSection entrepriseId={id} contacts={contacts} />
    </div>
  );
}
