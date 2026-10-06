import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/guards";
import { canAccessEntreprise } from "@/lib/crm-access";
import { computeMatchScore } from "@/lib/matching";
import { buildCandidateKeywords, scoreFonctionMatch } from "@/lib/poste-match";
import ContactEditForm from "./contact-edit-form";
import SuiviSection from "./suivi-section";
import PushCandidatsForm from "./push-candidats-form";

export const dynamic = "force-dynamic";

export default async function ContactDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; contactId: string }>;
  searchParams: Promise<{ pushedMany?: string }>;
}) {
  const session = await requireStaff();
  const { id, contactId } = await params;
  const { pushedMany } = await searchParams;

  const entreprise = await prisma.entreprise.findUnique({
    where: { id },
    include: { secteursRecherches: true, expertisesRecherchees: true },
  });
  if (!entreprise) notFound();
  if (!canAccessEntreprise(session.user, entreprise)) {
    redirect("/admin/crm");
  }

  const contact = await prisma.contact.findUnique({ where: { id: contactId } });
  if (!contact || contact.entrepriseId !== id) notFound();

  const [suivis, candidats, secteurs, expertises, consultantsPublies] = await Promise.all([
    prisma.suiviCommercial.findMany({
      where: { contactId },
      orderBy: { createdAt: "desc" },
      include: { createdBy: { select: { name: true } } },
    }),
    // Pour la recherche de candidat lors de la saisie d'un Rendez-vous
    // technique (RT) — voir suivi-section.tsx.
    prisma.consultant.findMany({
      orderBy: { nom: "asc" },
      select: { id: true, prenom: true, nom: true, referenceAnonyme: true },
    }),
    prisma.secteur.findMany({ where: { active: true }, select: { id: true, label: true } }),
    prisma.expertise.findMany({ where: { active: true }, select: { id: true, label: true } }),
    // Pour les suggestions de push en masse (secteurs/expertises + mots-clés
    // du poste de ce contact) — voir push-candidats-form.tsx.
    prisma.consultant.findMany({
      where: { statutPublication: "PUBLIEE" },
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
    }),
  ]);

  const secteurLabelById = new Map(secteurs.map((s) => [s.id, s.label]));
  const expertiseLabelById = new Map(expertises.map((e) => [e.id, e.label]));
  const secteurRechercheIds = entreprise.secteursRecherches.map((s) => s.secteurId);
  const expertiseRechercheIds = entreprise.expertisesRecherchees.map((x) => x.expertiseId);

  const candidatSuggestions = consultantsPublies
    .map((c) => {
      const candidatSecteurIds = c.secteurs.map((s) => s.secteurId);
      const candidatExpertiseIds = c.expertises.map((x) => x.expertiseId);
      const match = computeMatchScore({
        candidatSecteurIds,
        candidatExpertiseIds,
        candidatVilleLat: c.villeLat,
        candidatVilleLng: c.villeLng,
        candidatRayonKm: c.rayonKm,
        candidatDisponibilite: c.disponibilite,
        entrepriseSecteurIds: secteurRechercheIds,
        entrepriseExpertiseIds: expertiseRechercheIds,
        entrepriseVille: entreprise.ville,
      });
      const candidateKeywords = buildCandidateKeywords({
        intitulePoste: c.intitulePoste,
        secteurLabels: candidatSecteurIds
          .map((sid) => secteurLabelById.get(sid))
          .filter((l): l is string => Boolean(l)),
        expertiseLabels: candidatExpertiseIds
          .map((eid) => expertiseLabelById.get(eid))
          .filter((l): l is string => Boolean(l)),
      });
      const fonctionMatch = scoreFonctionMatch(contact.fonction, candidateKeywords);
      return {
        consultantId: c.id,
        referenceAnonyme: c.referenceAnonyme,
        intitulePoste: c.intitulePoste,
        totalScore: match.score + fonctionMatch.score,
        match,
        fonctionMots: fonctionMatch.mots,
      };
    })
    .filter((s) => s.totalScore > 0)
    .sort((a, b) => b.totalScore - a.totalScore)
    .slice(0, 20);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-brand-ink">
            {contact.prenom} {contact.nom}
          </h1>
          <p className="mt-1 text-sm text-brand-gray">
            {contact.fonction && <span className="font-medium text-brand-body">{contact.fonction}</span>}
            {contact.fonction && " · "}
            Chez{" "}
            <Link href={`/admin/crm/${id}`} className="link-underline text-brand-blue-dark">
              {entreprise.nom}
            </Link>
          </p>
        </div>
        <Link
          href={`/admin/crm/${id}`}
          className="link-underline text-sm text-brand-gray hover:text-brand-ink"
        >
          ← Retour à {entreprise.nom}
        </Link>
      </div>

      {pushedMany && (
        <div className="rounded-xl border border-brand-green/30 bg-brand-green/10 px-4 py-3 text-sm text-brand-green">
          ✅ {pushedMany} candidat{pushedMany !== "1" ? "s" : ""} proposé{pushedMany !== "1" ? "s" : ""} à
          ce contact — DC transmis par email, avec une trace dans l&apos;historique.
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-6">
          <ContactEditForm contact={contact} />
          {contact.email && (
            <PushCandidatsForm
              entrepriseId={id}
              contactId={contactId}
              suggestions={candidatSuggestions}
            />
          )}
        </div>

        <div className="lg:sticky lg:top-20 lg:self-start">
          <SuiviSection
            entrepriseId={id}
            contactId={contactId}
            contactEmail={contact.email}
            entrepriseNom={entreprise.nom}
            suivis={suivis}
            candidats={candidats}
          />
        </div>
      </div>
    </div>
  );
}
