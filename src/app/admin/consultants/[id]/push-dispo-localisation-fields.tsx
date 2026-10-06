import { DISPONIBILITE_LABELS } from "@/lib/constants";

/** Disponibilité + localisation pré-remplies depuis la fiche du candidat
 * quand elles y sont renseignées, modifiables avant l'envoi sinon (aucun des
 * deux champs n'est obligatoire dans l'ATS). */
export default function PushDispoLocalisationFields({
  disponibilite,
  localisation,
}: {
  disponibilite: string | null;
  localisation: string | null;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <div>
        <label className="block text-[11px] font-medium text-brand-gray">Disponibilité</label>
        <select name="disponibilite" defaultValue={disponibilite ?? ""} className="input mt-1 text-xs">
          <option value="">—</option>
          {Object.entries(DISPONIBILITE_LABELS).map(([code, label]) => (
            <option key={code} value={code}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-[11px] font-medium text-brand-gray">Localisation</label>
        <input
          name="localisation"
          defaultValue={localisation ?? ""}
          placeholder="Ville (rayon...)"
          className="input mt-1 text-xs"
        />
      </div>
    </div>
  );
}
