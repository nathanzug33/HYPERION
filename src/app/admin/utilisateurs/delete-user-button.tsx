"use client";

import { useState } from "react";
import { deleteUserAction } from "./actions";

type Admin = { id: string; name: string };

export default function DeleteUserButton({
  id,
  name,
  isClient,
  admins,
}: {
  id: string;
  name: string;
  isClient: boolean;
  admins: Admin[];
}) {
  const [open, setOpen] = useState(false);

  // Pour un compte staff, ses dossiers/historique sont automatiquement
  // réattribués à un administrateur avant suppression — s'il n'y en a
  // qu'un, pas besoin de demander ; sinon on ouvre un petit sélecteur.
  const needsPicker = !isClient && admins.length > 1;

  if (needsPicker && !open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="link-underline text-xs text-red-600 hover:text-red-700"
      >
        Supprimer
      </button>
    );
  }

  return (
    <form
      action={deleteUserAction}
      onSubmit={(e) => {
        if (
          !window.confirm(
            `Supprimer définitivement le compte de ${name} ? Cette action est irréversible.` +
              (!isClient
                ? " Ses dossiers et son historique seront réattribués à l'administrateur sélectionné."
                : "")
          )
        ) {
          e.preventDefault();
        }
      }}
      className="flex items-center gap-1.5"
    >
      <input type="hidden" name="id" value={id} />
      {needsPicker && (
        <select name="reassignToId" required className="input h-7 py-0 text-xs" defaultValue="">
          <option value="" disabled>
            Réattribuer à…
          </option>
          {admins.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      )}
      <button type="submit" className="link-underline text-xs text-red-600 hover:text-red-700">
        Supprimer
      </button>
    </form>
  );
}
