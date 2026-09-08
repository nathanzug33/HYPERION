import type { Entreprise, User } from "@prisma/client";
import { STATUT_ENTREPRISE_LABELS } from "@/lib/constants";
import { updateEntrepriseAction } from "../actions";

export default function EntrepriseEditForm({
  entreprise,
  bms,
  isAdmin,
}: {
  entreprise: Entreprise;
  bms: User[];
  isAdmin: boolean;
}) {
  return (
    <form action={updateEntrepriseAction} className="card space-y-4 p-5">
      <input type="hidden" name="id" value={entreprise.id} />

      <div>
        <label className="block text-xs font-medium text-brand-body">Nom de l&apos;entreprise</label>
        <input name="nom" defaultValue={entreprise.nom} required className="input mt-1.5" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-brand-body">Secteur d&apos;activité</label>
          <input
            name="secteurActivite"
            defaultValue={entreprise.secteurActivite ?? ""}
            className="input mt-1.5"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-brand-body">Taille (effectif)</label>
          <input
            name="tailleEffectif"
            defaultValue={entreprise.tailleEffectif ?? ""}
            placeholder="Ex. 50-200"
            className="input mt-1.5"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-brand-body">Site web</label>
        <input name="siteWeb" defaultValue={entreprise.siteWeb ?? ""} className="input mt-1.5" />
      </div>

      <div>
        <label className="block text-xs font-medium text-brand-body">Adresse</label>
        <input name="adresse" defaultValue={entreprise.adresse ?? ""} className="input mt-1.5" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-brand-body">Code postal</label>
          <input name="codePostal" defaultValue={entreprise.codePostal ?? ""} className="input mt-1.5" />
        </div>
        <div>
          <label className="block text-xs font-medium text-brand-body">Ville</label>
          <input name="ville" defaultValue={entreprise.ville ?? ""} className="input mt-1.5" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-brand-body">Statut commercial</label>
          <select
            name="statutCommercial"
            defaultValue={entreprise.statutCommercial}
            className="input mt-1.5"
          >
            {Object.entries(STATUT_ENTREPRISE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
        {isAdmin && (
          <div>
            <label className="block text-xs font-medium text-brand-body">
              Business manager référent
            </label>
            <select
              name="businessManagerId"
              defaultValue={entreprise.businessManagerId}
              className="input mt-1.5"
            >
              {bms.map((bm) => (
                <option key={bm.id} value={bm.id}>
                  {bm.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div>
        <label className="block text-xs font-medium text-brand-body">Notes</label>
        <textarea
          name="notes"
          defaultValue={entreprise.notes ?? ""}
          rows={4}
          className="input mt-1.5"
        />
      </div>

      <button type="submit" className="btn btn-primary px-6 py-2.5">
        Enregistrer les modifications
      </button>
    </form>
  );
}
