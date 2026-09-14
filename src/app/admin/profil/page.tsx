import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/guards";
import { ROLE_LABELS } from "@/lib/constants";
import TwoFactorSection from "@/components/TwoFactorSection";
import GoogleConnectionSection from "./google-connection-section";
import { updateOwnProfileAction, changeOwnPasswordAction } from "./actions";

export const dynamic = "force-dynamic";

const GOOGLE_ERROR_LABELS: Record<string, string> = {
  state: "La demande a expiré ou été rejouée — réessayez.",
  exchange: "Google n'a pas pu valider la connexion — réessayez.",
  access_denied: "Vous avez annulé la connexion à Google.",
};

const PWD_ERROR_LABELS: Record<string, string> = {
  actuel_incorrect: "Mot de passe actuel incorrect.",
  confirmation: "Les deux nouveaux mots de passe ne correspondent pas.",
  trop_court: "Le nouveau mot de passe doit faire au moins 8 caractères.",
};

export default async function StaffProfilPage({
  searchParams,
}: {
  searchParams: Promise<{
    google?: string;
    reason?: string;
    maj?: string;
    error?: string;
    pwdMaj?: string;
    pwdError?: string;
  }>;
}) {
  const session = await requireStaff();
  const { google, reason, maj, error, pwdMaj, pwdError } = await searchParams;

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.user.id },
  });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-brand-ink">Mon compte</h1>
        <p className="mt-1 text-sm text-brand-gray">
          Informations de connexion et sécurité de votre compte.
        </p>
      </div>

      {maj === "ok" && (
        <div className="rounded-xl border border-brand-green/30 bg-brand-green/10 px-4 py-3 text-sm text-brand-green">
          ✅ Informations mises à jour. Déconnectez-vous puis reconnectez-vous pour que
          votre nom se rafraîchisse partout (en-tête, emails envoyés...).
        </div>
      )}
      {error === "email_pris" && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          Cet email est déjà utilisé par un autre compte.
        </div>
      )}

      <form action={updateOwnProfileAction} className="card space-y-4 p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-brand-body">Nom</label>
            <input name="name" required defaultValue={user.name} className="input mt-1.5" />
          </div>
          <div>
            <label className="block text-xs font-medium text-brand-body">
              Email professionnel
            </label>
            <input
              type="email"
              name="email"
              required
              defaultValue={user.email}
              className="input mt-1.5"
            />
          </div>
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
        <div className="flex items-center justify-between">
          <p className="text-xs text-brand-gray">
            Le rôle n&apos;est modifiable que par un administrateur, depuis Utilisateurs.
          </p>
          <button type="submit" className="btn btn-primary">
            Enregistrer
          </button>
        </div>
      </form>

      {pwdMaj === "ok" && (
        <div className="rounded-xl border border-brand-green/30 bg-brand-green/10 px-4 py-3 text-sm text-brand-green">
          ✅ Mot de passe modifié.
        </div>
      )}
      {pwdError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {PWD_ERROR_LABELS[pwdError] ?? "Impossible de modifier le mot de passe."}
        </div>
      )}

      <form action={changeOwnPasswordAction} className="card space-y-4 p-5">
        <h2 className="text-sm font-semibold text-brand-ink">Changer mon mot de passe</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-xs font-medium text-brand-body">
              Mot de passe actuel
            </label>
            <input
              type="password"
              name="currentPassword"
              required
              autoComplete="current-password"
              className="input mt-1.5"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-brand-body">
              Nouveau mot de passe
            </label>
            <input
              type="password"
              name="newPassword"
              required
              minLength={8}
              autoComplete="new-password"
              className="input mt-1.5"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-brand-body">
              Confirmer le nouveau mot de passe
            </label>
            <input
              type="password"
              name="confirmPassword"
              required
              minLength={8}
              autoComplete="new-password"
              className="input mt-1.5"
            />
          </div>
        </div>
        <div className="flex justify-end">
          <button type="submit" className="btn btn-primary">
            Modifier le mot de passe
          </button>
        </div>
      </form>

      {google === "connected" && (
        <div className="rounded-xl border border-brand-green/30 bg-brand-green/10 px-4 py-3 text-sm text-brand-green">
          ✅ Compte Google connecté.
        </div>
      )}
      {google === "error" && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {(reason && GOOGLE_ERROR_LABELS[reason]) ??
            "La connexion à Google a échoué — réessayez."}
        </div>
      )}

      <div className="card space-y-3 p-5">
        <h2 className="text-sm font-semibold text-brand-ink">
          Gmail &amp; Google Agenda
        </h2>
        <GoogleConnectionSection
          connectedEmail={user.googleEmail}
          connectedAt={user.googleConnectedAt}
        />
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
