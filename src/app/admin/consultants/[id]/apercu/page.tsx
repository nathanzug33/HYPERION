import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/guards";
import { STATUT_PUBLICATION_LABELS } from "@/lib/constants";
import { consultantPublicSelect } from "@/lib/consultant-view";
import ConsultantDetail from "@/components/consultant/ConsultantDetail";
import { canAccessConsultant } from "@/lib/consultant-access";

export const dynamic = "force-dynamic";

export default async function ConsultantApercuPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireStaff();
  const { id } = await params;

  const consultant = await prisma.consultant.findUnique({
    where: { id },
    select: {
      ...consultantPublicSelect,
      nom: true,
      prenom: true,
      businessManagerId: true,
    },
  });

  if (!consultant) notFound();
  if (!(await canAccessConsultant(session.user, consultant))) {
    redirect("/admin/consultants");
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/admin/consultants" className="link-underline text-sm text-brand-gray hover:text-brand-ink">
          ← Retour à la liste
        </Link>
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
            Aperçu vue client — {consultant.prenom} {consultant.nom} (
            {STATUT_PUBLICATION_LABELS[
              consultant.statutPublication as keyof typeof STATUT_PUBLICATION_LABELS
            ] ?? consultant.statutPublication}
            )
          </span>
          <Link href={`/admin/consultants/${id}`} className="btn btn-primary">
            Modifier ce dossier
          </Link>
        </div>
      </div>

      {consultant.statutPublication !== "PUBLIEE" && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Cette fiche n&apos;est pas encore publiée : elle n&apos;est pas
          visible dans la bibliothèque client. Ce qui suit est exactement ce
          qu&apos;un client verrait une fois la fiche publiée.
        </div>
      )}

      <div className="card animate-fade-in p-6 sm:p-7">
        <ConsultantDetail consultant={consultant} />
      </div>
    </div>
  );
}
