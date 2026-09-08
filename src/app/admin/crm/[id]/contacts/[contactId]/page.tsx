import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/guards";
import { canAccessEntreprise } from "@/lib/crm-access";
import ContactEditForm from "./contact-edit-form";
import SuiviSection from "./suivi-section";

export const dynamic = "force-dynamic";

export default async function ContactDetailPage({
  params,
}: {
  params: Promise<{ id: string; contactId: string }>;
}) {
  const session = await requireStaff();
  const { id, contactId } = await params;

  const entreprise = await prisma.entreprise.findUnique({ where: { id } });
  if (!entreprise) notFound();
  if (!canAccessEntreprise(session.user, entreprise)) {
    redirect("/admin/crm");
  }

  const contact = await prisma.contact.findUnique({ where: { id: contactId } });
  if (!contact || contact.entrepriseId !== id) notFound();

  const suivis = await prisma.suiviCommercial.findMany({
    where: { contactId },
    orderBy: { createdAt: "desc" },
    include: { createdBy: { select: { name: true } } },
  });

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

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
        <ContactEditForm contact={contact} />

        <div className="lg:sticky lg:top-20 lg:self-start">
          <SuiviSection entrepriseId={id} contactId={contactId} suivis={suivis} />
        </div>
      </div>
    </div>
  );
}
