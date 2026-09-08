import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/guards";
import { ROLES } from "@/lib/constants";
import { consultantPublicSelect } from "@/lib/consultant-view";
import ConsultantDetail from "@/components/consultant/ConsultantDetail";
import ConsultantEditForm from "./consultant-edit-form";
import {
  archiveConsultantAction,
  publishConsultantAction,
  purgeConsultantAction,
  unpublishConsultantAction,
} from "../actions";
import { STATUT_PUBLICATION_LABELS } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function ConsultantEditPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; ia?: string }>;
}) {
  const session = await requireStaff();
  const { id } = await params;
  const { error, ia } = await searchParams;

  const consultant = await prisma.consultant.findUnique({
    where: { id },
    include: {
      secteurs: true,
      expertises: true,
      competences: true,
      typesMobilite: true,
      zonesGeographiques: true,
      langues: true,
      businessManager: true,
      competenceCategories: { orderBy: { ordre: "asc" } },
      formations: { orderBy: { ordre: "asc" } },
      experiences: { orderBy: { ordre: "asc" } },
    },
  });

  if (!consultant) notFound();
  if (
    session.user.role !== ROLES.ADMIN &&
    consultant.businessManagerId !== session.user.id
  ) {
    redirect("/admin/consultants");
  }

  const [
    secteurs,
    expertises,
    seniorites,
    typesMobilite,
    zones,
    competences,
    langues,
    bms,
    publicView,
  ] = await Promise.all([
    prisma.secteur.findMany({ where: { active: true }, orderBy: { ordre: "asc" } }),
    prisma.expertise.findMany({ where: { active: true }, orderBy: { ordre: "asc" } }),
    prisma.seniorite.findMany({ where: { active: true }, orderBy: { ordre: "asc" } }),
    prisma.typeMobilite.findMany({ where: { active: true }, orderBy: { ordre: "asc" } }),
    prisma.zoneGeographique.findMany({ where: { active: true }, orderBy: { ordre: "asc" } }),
    prisma.competence.findMany({ where: { active: true }, orderBy: { label: "asc" } }),
    prisma.langue.findMany({ where: { active: true }, orderBy: { label: "asc" } }),
    session.user.role === ROLES.ADMIN
      ? prisma.user.findMany({ where: { role: ROLES.BM, active: true }, orderBy: { name: "asc" } })
      : Promise.resolve([]),
    prisma.consultant.findUnique({ where: { id }, select: consultantPublicSelect }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-brand-ink">
            {consultant.prenom} {consultant.nom}{" "}
            <span className="font-mono text-base font-normal text-brand-gray">
              — {consultant.referenceAnonyme}
            </span>
          </h1>
          <p className="mt-1 text-sm text-brand-gray">
            Statut :{" "}
            <span className="font-medium text-brand-body">
              {STATUT_PUBLICATION_LABELS[
                consultant.statutPublication as keyof typeof STATUT_PUBLICATION_LABELS
              ] ?? consultant.statutPublication}
            </span>
            {" · "}BM référent : {consultant.businessManager.name}
          </p>
        </div>
        <Link href="/admin/consultants" className="link-underline text-sm text-brand-gray hover:text-brand-ink">
          ← Retour à la liste
        </Link>
      </div>

      {ia && consultant.genereParIA && (
        <div className="card border-l-4 border-l-brand-blue px-4 py-3 text-sm text-brand-ink">
          Dossier pré-rempli par l&apos;IA à partir du CV et de la
          transcription d&apos;entretien. Vérifiez les informations
          (notamment l&apos;absence de donnée identifiante dans le contexte
          des missions), complétez le nom si besoin, cochez les
          consentements RGPD, puis publiez.
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="card flex flex-wrap items-center gap-2 p-3">
        <form action={publishConsultantAction}>
          <input type="hidden" name="id" value={id} />
          <button type="submit" className="btn bg-brand-green text-white hover:brightness-110">
            Publier
          </button>
        </form>
        <form action={unpublishConsultantAction}>
          <input type="hidden" name="id" value={id} />
          <button type="submit" className="btn btn-secondary">
            Dépublier
          </button>
        </form>
        <form action={archiveConsultantAction}>
          <input type="hidden" name="id" value={id} />
          <button type="submit" className="btn btn-secondary">
            Archiver
          </button>
        </form>
        <a href={`/admin/consultants/${id}/export-word`} className="btn btn-accent">
          Télécharger le DC (Word)
        </a>
        {session.user.role === ROLES.ADMIN && (
          <form action={purgeConsultantAction} className="ml-auto">
            <input type="hidden" name="id" value={id} />
            <button
              type="submit"
              className="btn border border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
            >
              Supprimer définitivement (RGPD)
            </button>
          </form>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <ConsultantEditForm
          consultant={consultant}
          referentials={{ secteurs, expertises, seniorites, typesMobilite, zones, competences, langues, bms }}
          isAdmin={session.user.role === ROLES.ADMIN}
        />

        <div className="lg:sticky lg:top-20 lg:self-start">
          <div className="card p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-brand-ink">
                Aperçu — ce que voit le client
              </h2>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-brand-blue-bg px-2 py-0.5 text-xs font-medium text-brand-blue-dark">
                  anonymisé
                </span>
                <Link
                  href={`/admin/consultants/${id}/apercu`}
                  className="link-underline text-xs text-brand-blue-dark"
                >
                  Plein écran
                </Link>
              </div>
            </div>
            {publicView && <ConsultantDetail consultant={publicView} />}
          </div>
        </div>
      </div>
    </div>
  );
}
