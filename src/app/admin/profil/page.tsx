import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/guards";
import { ROLE_LABELS } from "@/lib/constants";
import TwoFactorSection from "@/components/TwoFactorSection";

export const dynamic = "force-dynamic";

export default async function StaffProfilPage() {
  const session = await requireStaff();

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.user.id },
  });

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-brand-ink">Mon compte</h1>
        <p className="mt-1 text-sm text-brand-gray">
          Informations de connexion et sécurité de votre compte.
        </p>
      </div>

      <div className="card space-y-4 p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <ReadOnlyField label="Nom" value={user.name} />
          <ReadOnlyField label="Email professionnel" value={user.email} />
          <ReadOnlyField
            label="Rôle"
            value={ROLE_LABELS[user.role as keyof typeof ROLE_LABELS] ?? user.role}
          />
          <ReadOnlyField
            label="Dernière connexion"
            value={
              user.lastLoginAt
                ? new Date(user.lastLoginAt).toLocaleString("fr-FR")
                : "—"
            }
          />
        </div>
        <p className="text-xs text-brand-gray">
          Nom, email et rôle sont gérés par l&apos;administrateur.
        </p>
      </div>

      <div className="card space-y-3 p-5">
        <h2 className="text-sm font-semibold text-brand-ink">
          Double authentification (2FA)
        </h2>
        <TwoFactorSection enabled={user.twoFactorEnabled} />
      </div>
    </div>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="block text-xs font-medium text-brand-body">{label}</span>
      <div className="mt-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-brand-gray">
        {value}
      </div>
    </div>
  );
}
