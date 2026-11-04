"use client";

import { CIVILITE_LABELS } from "@/lib/constants";
import { createConsultantAction, requestCvUploadAction } from "../actions";
import CvUploadField from "@/components/CvUploadField";

export default function NouveauConsultantForm() {
  return (
    <form action={createConsultantAction} className="card space-y-4 p-5">
      <div>
        <label className="block text-xs font-medium text-brand-body">Civilité</label>
        <select name="civilite" defaultValue="" className="input mt-1.5">
          <option value="">—</option>
          {Object.entries(CIVILITE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-brand-body">Prénom</label>
          <input name="prenom" required className="input mt-1.5" />
        </div>
        <div>
          <label className="block text-xs font-medium text-brand-body">Nom</label>
          <input name="nom" required className="input mt-1.5" />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-brand-body">Email</label>
        <input name="email" type="email" className="input mt-1.5" />
      </div>
      <div>
        <label className="block text-xs font-medium text-brand-body">Téléphone</label>
        <input name="telephone" className="input mt-1.5" />
      </div>
      <CvUploadField label="CV (optionnel)" requestUpload={requestCvUploadAction} />
      <button type="submit" className="btn btn-primary w-full py-2.5">
        Créer le dossier
      </button>
    </form>
  );
}
