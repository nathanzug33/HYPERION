import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/guards";
import { ROLES, STATUT_ENTREPRISE_LABELS } from "@/lib/constants";
import { canAccessEntreprise } from "@/lib/crm-access";
import EntrepriseEditForm from "./entreprise-edit-form";
import EntrepriseInfoModal from "./entreprise-info-modal";
import ContactsSection from "./contacts-section";
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

  const [contacts, bms] = await Promise.all([
    prisma.contact.findMany({
      where: { entrepriseId: id },
      orderBy: [{ principal: "desc" }, { createdAt: "asc" }],
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
            {entreprise.ville && ` · ${entreprise.ville}`}
          </p>
        </div>
        <Link href="/admin/crm" className="link-underline text-sm text-brand-gray hover:text-brand-ink">
          ← Retour à la liste
        </Link>
      </div>

      <div className="card flex flex-wrap items-center gap-2 p-3">
        <EntrepriseInfoModal triggerLabel="ℹ️ Informations de l'entreprise">
          <EntrepriseEditForm
            entreprise={entreprise}
            bms={bms}
            isAdmin={session.user.role === ROLES.ADMIN}
          />
        </EntrepriseInfoModal>
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

      <ContactsSection entrepriseId={id} contacts={contacts} />
    </div>
  );
}
