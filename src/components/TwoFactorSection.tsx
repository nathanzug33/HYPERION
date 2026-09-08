"use client";

import { useActionState } from "react";
import {
  startTwoFactorEnrollmentAction,
  confirmTwoFactorEnrollmentAction,
  disableTwoFactorAction,
  type TwoFactorEnrollState,
  type TwoFactorConfirmState,
  type TwoFactorDisableState,
} from "@/lib/two-factor-actions";

const enrollInitial: TwoFactorEnrollState = {};
const confirmInitial: TwoFactorConfirmState = {};
const disableInitial: TwoFactorDisableState = {};

export default function TwoFactorSection({ enabled }: { enabled: boolean }) {
  const [enrollState, enrollAction, enrolling] = useActionState(
    startTwoFactorEnrollmentAction,
    enrollInitial
  );
  const [confirmState, confirmAction, confirming] = useActionState(
    confirmTwoFactorEnrollmentAction,
    confirmInitial
  );
  const [disableState, disableAction, disabling] = useActionState(
    disableTwoFactorAction,
    disableInitial
  );

  // Dérivé directement des retours d'action plutôt que synchronisé via un
  // effet : évite un rendu en cascade pour un simple reflet d'état serveur.
  const isEnabled = disableState.disabled
    ? false
    : confirmState.enabled
      ? true
      : enabled;

  if (isEnabled) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-brand-green">
          ✅ Double authentification activée sur ce compte.
        </p>
        <form action={disableAction} className="flex flex-wrap items-end gap-2">
          <div>
            <label className="block text-xs font-medium text-brand-body">
              Mot de passe (pour désactiver)
            </label>
            <input
              type="password"
              name="password"
              required
              className="input mt-1.5"
            />
          </div>
          <button type="submit" disabled={disabling} className="btn btn-secondary">
            {disabling ? "…" : "Désactiver"}
          </button>
        </form>
        {disableState.error && (
          <p className="text-sm text-red-600">{disableState.error}</p>
        )}
      </div>
    );
  }

  if (enrollState.qrCodeDataUrl) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-brand-body">
          Scannez ce QR code avec Google Authenticator, Microsoft
          Authenticator ou toute application compatible TOTP, puis entrez le
          code à 6 chiffres généré pour confirmer l&apos;activation.
        </p>
        {/* Data URI générée localement (QRCode.toDataURL) — pas une source externe. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={enrollState.qrCodeDataUrl}
          alt="QR code de double authentification"
          className="h-40 w-40 rounded-lg border border-slate-200"
        />
        <p className="text-xs text-brand-gray">
          Clé manuelle (si le scan ne fonctionne pas) :{" "}
          <span className="font-mono">{enrollState.manualKey}</span>
        </p>
        <form action={confirmAction} className="flex flex-wrap items-end gap-2">
          <div>
            <label className="block text-xs font-medium text-brand-body">
              Code à 6 chiffres
            </label>
            <input
              name="code"
              required
              inputMode="numeric"
              pattern="[0-9]{6}"
              autoFocus
              className="input mt-1.5 w-32"
            />
          </div>
          <button type="submit" disabled={confirming} className="btn btn-primary">
            {confirming ? "Vérification…" : "Confirmer l'activation"}
          </button>
        </form>
        {confirmState.error && (
          <p className="text-sm text-red-600">{confirmState.error}</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-brand-gray">
        Double authentification non activée. Recommandé pour protéger l&apos;accès
        à votre compte.
      </p>
      <form action={enrollAction}>
        <button type="submit" disabled={enrolling} className="btn btn-secondary">
          {enrolling ? "Génération…" : "Activer la double authentification"}
        </button>
      </form>
      {enrollState.error && (
        <p className="text-sm text-red-600">{enrollState.error}</p>
      )}
    </div>
  );
}
