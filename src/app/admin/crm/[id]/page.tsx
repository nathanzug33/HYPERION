import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/guards";
import { ROLES, STATUT_ENTREPRISE_LABELS } from "@/lib/constants";
import { canAccessEntreprise } from "@/lib/crm-access";
import EntrepriseEditForm from "./entreprise-edit-form";
import ContactsSection from "./contacts-section";
import SuiviSection from "./suivi-section";
import { deleteEntrepriseAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function EntrepriseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireStaff();
  const { id } = await params;

  const entreprise = await prisma.entreprise.findUnique({
    where: { id },
    include: { businessManager: true },
  });

  if (!entreprise) notFound();
  if (!canAccessEntreprise(session.user, entreprise)) {
    redirect("/admin/crm");
  }

  const [contacts, suivis, bms] = await Promise.all([
    prisma.contact.findMany({
      where: { entrepriseId: id },
      orderBy: [{ principal: "desc" }, { createdAt: "asc" }],
    }),
    prisma.suiviCommercial.findMany({
      where: { entrepriseId: id },
      orderBy: { createdAt: "desc" },
      include: {
        createdBy: { select: { name: true } },
        contact: { select: { id: true, prenom: true, nom: true } },
      },
    }),
    session.user.role === ROLES.ADMIN
      ? prisma.user.findMany({ where: { role: ROLES.BM, active: true }, orderBy: { name: "asc" } })
      : Promise.resolve([]),
  ]);

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
          </p>
        </div>
        <Link href="/admin/crm" className="link-underline text-sm text-brand-gray hover:text-brand-ink">
          ← Retour à la liste
        </Link>
      </div>

      {session.user.role === ROLES.ADMIN && (
        <div className="card flex items-center p-3">
          <form action={deleteEntrepriseAction} className="ml-auto">
            <input type="hidden" name="id" value={id} />
            <button
              type="submit"
              className="btn border border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
            >
              Supprimer définitivement
            </button>
          </form>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-6">
          <EntrepriseEditForm
            entreprise={entreprise}
            bms={bms}
            isAdmin={session.user.role === ROLES.ADMIN}
          />
          <ContactsSection entrepriseId={id} contacts={contacts} />
        </div>

        <div className="space-y-6 lg:sticky lg:top-20 lg:self-start">
          <SuiviSection
            entrepriseId={id}
            contacts={contacts.map((c) => ({ id: c.id, prenom: c.prenom, nom: c.nom }))}
            suivis={suivis}
          />
        </div>
      </div>
    </div>
  );
}
