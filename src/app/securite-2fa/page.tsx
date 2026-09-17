import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/guards";
import { ROLES } from "@/lib/constants";
import TwoFactorSection from "@/components/TwoFactorSection";
import LogoutButton from "@/components/LogoutButton";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

// Passage obligatoire pour tout le personnel interne (ADMIN, Directeur de
// BU, BM) tant que la 2FA n'est pas activée — voir requireTwoFactorEnabled
// dans src/lib/guards.ts, qui redirige ici depuis n'importe quelle page
// admin. Volontairement HORS du layout /admin (pas de sidebar) : ce dernier
// appelle requireStaff(), qui redirigerait de nouveau ici en boucle.
export default async function Securite2FAPage() {
  const session = await requireSession();

  if (session.user.role === ROLES.CLIENT) {
    redirect("/bibliotheque");
  }

  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.user.id } });
  if (user.twoFactorEnabled) {
    redirect("/admin");
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="topbar-gradient absolute inset-0" />
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-md space-y-6">
          <div className="flex justify-center">
            <Image
              src="/kervyo-sidebar-dark.png"
              alt="KERVYO by Hyperion Group"
              width={1424}
              height={288}
              className="h-9 w-auto"
              priority
            />
          </div>

          <div className="card space-y-4 p-6">
            <div>
              <h1 className="text-lg font-semibold text-brand-ink">
                Double authentification requise
              </h1>
              <p className="mt-1.5 text-sm text-brand-body">
                Pour protéger les données candidats et clients, la double authentification
                est désormais obligatoire pour tous les comptes internes. Configurez-la
                ci-dessous pour continuer — cela ne prend qu&apos;une minute.
              </p>
            </div>

            <TwoFactorSection enabled={false} />

            <div className="border-t border-slate-100 pt-4 text-center">
              <Link href="/admin" className="link-underline text-sm text-brand-blue-dark">
                J&apos;ai activé la 2FA → accéder à mon espace
              </Link>
            </div>
          </div>

          <div className="text-center">
            <LogoutButton />
          </div>
        </div>
      </div>
    </div>
  );
}
