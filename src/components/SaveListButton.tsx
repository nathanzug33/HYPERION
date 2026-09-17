"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { createSavedListAction } from "@/app/admin/listes/actions";
import { SAVED_LIST_VISIBILITY, type SavedListScope } from "@/lib/constants";

/** Bouton "Enregistrer cette recherche" — capture la querystring actuelle de
 * la page (tous les filtres déjà appliqués) et la sauvegarde sous un nom,
 * pour la rejouer depuis /admin/listes. Pas de moteur de filtres séparé à
 * maintenir : la page de recherche existante porte déjà toute la logique. */
export default function SaveListButton({ scope }: { scope: SavedListScope }) {
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="btn btn-secondary text-sm">
        💾 Enregistrer cette recherche
      </button>
    );
  }

  return (
    <form
      action={createSavedListAction}
      className="flex flex-wrap items-center gap-2"
      onSubmit={() => setOpen(false)}
    >
      <input type="hidden" name="scope" value={scope} />
      <input type="hidden" name="queryString" value={searchParams.toString()} />
      <input
        type="text"
        name="name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nom de la liste"
        required
        autoFocus
        className="input w-56 text-sm"
      />
      <select name="visibility" defaultValue={SAVED_LIST_VISIBILITY.PRIVEE} className="input w-auto text-sm">
        <option value={SAVED_LIST_VISIBILITY.PRIVEE}>Privée</option>
        <option value={SAVED_LIST_VISIBILITY.PARTAGEE}>Partagée</option>
      </select>
      <button type="submit" className="btn btn-primary text-sm">
        Enregistrer
      </button>
      <button type="button" onClick={() => setOpen(false)} className="text-sm text-brand-gray hover:text-brand-ink">
        Annuler
      </button>
    </form>
  );
}
