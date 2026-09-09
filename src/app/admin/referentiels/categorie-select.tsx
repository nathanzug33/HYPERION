"use client";

import { setReferentialCategorieAction } from "./actions";
import type { ReferentialType } from "@/lib/referentials";

export default function CategorieSelect({
  type,
  id,
  categorie,
}: {
  type: ReferentialType;
  id: string;
  categorie: string | null;
}) {
  return (
    <form action={setReferentialCategorieAction}>
      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="id" value={id} />
      <select
        name="categorie"
        defaultValue={categorie ?? ""}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="input py-0.5 text-xs"
        title="Bloc d'affichage sur la fiche candidat"
      >
        <option value="">—</option>
        <option value="DIGITAL">IT</option>
        <option value="INDUSTRIE">Industrie</option>
      </select>
    </form>
  );
}
