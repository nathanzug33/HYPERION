"use client";

import { useState } from "react";
import { CIVILITE_LABELS } from "@/lib/constants";
import { createConsultantAction, requestCvUploadAction } from "./actions";
import CvUploadField from "@/components/CvUploadField";

export default function NouveauCandidatPopover() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen((o) => !o)} className="btn btn-secondary">
        + Ajouter un candidat
      </button>

      {open && (
        <div className="fixed bottom-4 right-4 z-50 w-[min(92vw,420px)] max-h-[80vh] overflow-y-auto card p-4 shadow-xl">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-brand-ink">Nouveau candidat</h2>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Fermer"
              className="text-brand-gray hover:text-brand-ink"
            >
              ✕
            </button>
          </div>

          <form action={createConsultantAction} className="space-y-2">
            <div>
              <label className="block text-[11px] text-brand-gray">Civilité</label>
              <select name="civilite" defaultValue="" className="input text-xs">
                <option value="">—</option>
                {Object.entries(CIVILITE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] text-brand-gray">Prénom</label>
                <input name="prenom" required className="input text-xs" />
              </div>
              <div>
                <label className="block text-[11px] text-brand-gray">Nom</label>
                <input name="nom" required className="input text-xs" />
              </div>
            </div>
            <div>
              <label className="block text-[11px] text-brand-gray">Email</label>
              <input name="email" type="email" className="input text-xs" />
            </div>
            <div>
              <label className="block text-[11px] text-brand-gray">Téléphone</label>
              <input name="telephone" className="input text-xs" />
            </div>
            <CvUploadField
              label="CV (optionnel)"
              requestUpload={requestCvUploadAction}
              inputClassName="mt-1 block w-full text-xs text-brand-gray file:mr-2 file:rounded-md file:border-0 file:bg-brand-blue file:px-2 file:py-1 file:text-[11px] file:font-medium file:text-white disabled:opacity-60"
            />
            <button type="submit" className="btn btn-primary w-full py-1.5 text-xs">
              Créer le dossier
            </button>
          </form>
        </div>
      )}
    </>
  );
}
