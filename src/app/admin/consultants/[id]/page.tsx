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
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await requireStaff();
  const { id } = await params;
  const { error } = await searchParams;

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">
            {consultant.prenom} {consultant.nom}{" "}
            <span className="text-slate-400 font-normal">
              — {consultant.referenceAnonyme}
            </span>
          </h1>
          <p className="text-sm text-slate-500">
            Statut :{" "}
            <span className="font-medium text-slate-700">
              {STATUT_PUBLICATION_LABELS[
                consultant.statutPublication as keyof typeof STATUT_PUBLICATION_LABELS
              ] ?? consultant.statutPublication}
            </span>
            {" · "}BM référent : {consultant.businessManager.name}
          </p>
        </div>
        <Link href="/admin/consultants" className="text-sm text-slate-500 underline">
          Retour à la liste
        </Link>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <form action={publishConsultantAction}>
          <input type="hidden" name="id" value={id} />
          <button
            type="submit"
            className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-500"
          >
            Publier
          </button>
        </form>
        <form action={unpublishConsultantAction}>
          <input type="hidden" name="id" value={id} />
          <button
            type="submit"
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100"
          >
            Dépublier
          </button>
        </form>
        <form action={archiveConsultantAction}>
          <input type="hidden" name="id" value={id} />
          <button
            type="submit"
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100"
          >
            Archiver
          </button>
        </form>
        {session.user.role === ROLES.ADMIN && (
          <form
            action={purgeConsultantAction}
            className="ml-auto"
          >
            <input type="hidden" name="id" value={id} />
            <button
              type="submit"
              className="rounded-md border border-red-200 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50"
            >
              Supprimer définitivement (RGPD)
            </button>
          </form>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <ConsultantEditForm
          consultant={consultant}
          referentials={{ secteurs, expertises, seniorites, typesMobilite, zones, competences, langues, bms }}
          isAdmin={session.user.role === ROLES.ADMIN}
        />

        <div className="lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">
                Aperçu — ce que voit le client
              </h2>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                anonymisé
              </span>
            </div>
            {publicView && <ConsultantDetail consultant={publicView} />}
          </div>
        </div>
      </div>
    </div>
  );
}
