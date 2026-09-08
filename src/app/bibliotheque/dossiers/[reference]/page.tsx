import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { ROLES } from "@/lib/constants";
import { consultantPublicSelect } from "@/lib/consultant-view";
import ConsultantDetail from "@/components/consultant/ConsultantDetail";
import ContactRequestButton from "@/components/consultant/ContactRequestButton";

export const dynamic = "force-dynamic";

export default async function ConsultantDetailPage({
  params,
}: {
  params: Promise<{ reference: string }>;
}) {
  const session = await auth();
  const { reference } = await params;

  const consultant = await prisma.consultant.findFirst({
    where: { referenceAnonyme: reference, statutPublication: "PUBLIEE" },
    select: consultantPublicSelect,
  });

  if (!consultant) notFound();

  if (session?.user.role === ROLES.CLIENT) {
    await prisma.consultationLog.create({
      data: { userId: session.user.id, consultantId: consultant.id },
    });
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <Link href="/bibliotheque/dossiers" className="link-underline text-sm text-brand-gray hover:text-brand-ink">
        ← Retour à la bibliothèque
      </Link>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_260px]">
        <div className="card animate-fade-in p-6 sm:p-7">
          <ConsultantDetail consultant={consultant} />
        </div>

        <div className="lg:sticky lg:top-20 lg:self-start">
          <div className="card p-5 text-center">
            <div className="text-xs font-mono uppercase tracking-wide text-brand-gray">
              {consultant.referenceAnonyme}
            </div>
            <p className="mt-2 text-sm text-brand-body">
              Ce profil vous intéresse ? Décrivez votre besoin, votre business
              manager reviendra vers vous avec les disponibilités confirmées.
            </p>
            {session?.user.role === ROLES.CLIENT ? (
              <div className="mt-4">
                <ContactRequestButton
                  consultantId={consultant.id}
                  reference={consultant.referenceAnonyme}
                />
              </div>
            ) : (
              <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                Aperçu back-office — la demande de contact est réservée aux comptes client.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
