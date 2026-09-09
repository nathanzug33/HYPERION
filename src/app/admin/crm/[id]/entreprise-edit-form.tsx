import type {
  Entreprise,
  EntrepriseExpertiseRecherchee,
  EntrepriseSecteurRecherche,
  User,
} from "@prisma/client";
import CheckboxGroup from "@/components/form/CheckboxGroup";
import { STATUT_ENTREPRISE_LABELS } from "@/lib/constants";
import { updateEntrepriseAction } from "../actions";
import SecteurActiviteFields from "../secteur-activite-fields";

type Referential = { id: string; label: string };

type EntrepriseWithRecherches = Entreprise & {
  secteursRecherches: EntrepriseSecteurRecherche[];
  expertisesRecherchees: EntrepriseExpertiseRecherchee[];
};

export default function EntrepriseEditForm({
  entreprise,
  bms,
  canReassignReferent,
  secteurs,
  expertises,
  industries,
}: {
  entreprise: EntrepriseWithRecherches;
  bms: User[];
  canReassignReferent: boolean;
  secteurs: Referential[];
  expertises: Referential[];
  industries: Referential[];
}) {
  return (
    <form action={updateEntrepriseAction} className="card space-y-4 p-5">
      <input type="hidden" name="id" value={entreprise.id} />

      <div>
        <label className="block text-xs font-medium text-brand-body">Nom de l&apos;entreprise</label>
        <input name="nom" defaultValue={entreprise.nom} required className="input mt-1.5" />
      </div>

      <SecteurActiviteFields
        industries={industries}
        defaultCategorie={entreprise.secteurCategorie}
        defaultIndustrieId={entreprise.industrieId}
      />

      <div>
        <label className="block text-xs font-medium text-brand-body">Taille (effectif)</label>
        <input
          name="tailleEffectif"
          defaultValue={entreprise.tailleEffectif ?? ""}
          placeholder="Ex. 50-200"
          className="input mt-1.5"
        />
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
        {canReassignReferent && (
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

      <div className="border-t border-slate-100 pt-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand-blue-dark">
          Profils habituellement recherchés
        </p>
        <p className="mb-3 text-xs text-brand-gray">
          Alimente les suggestions de candidats correspondants sur cette fiche.
        </p>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-brand-body">Secteurs recherchés</label>
            <div className="mt-1.5">
              <CheckboxGroup
                name="secteurRechercheIds"
                options={secteurs}
                selectedIds={new Set(entreprise.secteursRecherches.map((s) => s.secteurId))}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-brand-body">Expertises recherchées</label>
            <div className="mt-1.5">
              <CheckboxGroup
                name="expertiseRechercheIds"
                options={expertises}
                selectedIds={new Set(entreprise.expertisesRecherchees.map((e) => e.expertiseId))}
              />
            </div>
          </div>
        </div>
      </div>

      <button type="submit" className="btn btn-primary px-6 py-2.5">
        Enregistrer les modifications
      </button>
    </form>
  );
}
