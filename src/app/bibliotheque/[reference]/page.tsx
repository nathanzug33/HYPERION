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
    <div className="max-w-2xl">
      <Link href="/bibliotheque" className="text-sm text-brand-gray underline">
        ← Retour à la bibliothèque
      </Link>

      <div className="mt-4 rounded-lg border border-slate-200 bg-white p-6">
        <ConsultantDetail consultant={consultant} />

        {session?.user.role === ROLES.CLIENT && (
          <div className="mt-6 border-t border-slate-100 pt-4">
            <ContactRequestButton
              consultantId={consultant.id}
              reference={consultant.referenceAnonyme}
            />
          </div>
        )}
      </div>
    </div>
  );
}
