import { prisma } from "@/lib/prisma";
import { requireClient } from "@/lib/guards";
import ProfileForm from "./profile-form";

export const dynamic = "force-dynamic";

export default async function ProfilPage() {
  const session = await requireClient();

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.user.id },
    include: { clientOrganization: true },
  });

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-brand-ink">Mon profil</h1>
        <p className="mt-1 text-sm text-brand-gray">
          Ces informations permettent à votre business manager de vous
          recontacter dans le bon contexte. Le nom, l&apos;email et la
          société sont gérés par HYPERION ; complétez le reste vous-même.
        </p>
      </div>

      <div className="card space-y-4 p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <ReadOnlyField label="Nom" value={user.name} />
          <ReadOnlyField label="Email professionnel" value={user.email} />
          <ReadOnlyField label="Société" value={user.clientOrganization?.name ?? "—"} />
          <ReadOnlyField
            label="Dernière connexion"
            value={
              user.lastLoginAt
                ? new Date(user.lastLoginAt).toLocaleString("fr-FR")
                : "—"
            }
          />
        </div>

        <div className="border-t border-slate-100 pt-4">
          <ProfileForm poste={user.poste ?? ""} telephone={user.telephone ?? ""} />
        </div>
      </div>

      <p className="text-xs text-brand-gray">
        Besoin de corriger votre nom, votre email ou votre société ? Contactez
        votre business manager — ces champs sont gérés par l&apos;équipe
        HYPERION pour garantir la fiabilité des accès.
      </p>
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
