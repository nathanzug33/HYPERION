"use client";

import { useActionState } from "react";
import { generateConsultantFromAI, type GenerateIaState } from "./actions";

const initialState: GenerateIaState = {};

export default function GenerateIaForm({
  bms,
  isAdmin,
}: {
  bms: { id: string; name: string }[];
  isAdmin: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    generateConsultantFromAI,
    initialState
  );

  return (
    <form
      action={formAction}
      className="space-y-5 rounded-lg border border-slate-200 bg-white p-4"
    >
      {isAdmin && (
        <div>
          <label className="block text-xs font-medium text-brand-body">
            Business manager référent
          </label>
          <select
            name="businessManagerId"
            required
            className="input mt-1"
          >
            {bms.map((bm) => (
              <option key={bm.id} value={bm.id}>
                {bm.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="block text-xs font-medium text-brand-body mb-1">
          CV — coller le texte ou déposer un fichier (.pdf, .txt)
        </label>
        <textarea
          name="cvText"
          rows={6}
          placeholder="Collez ici le contenu du CV…"
          className="input"
        />
        <input
          type="file"
          name="cvFile"
          accept=".pdf,.txt,application/pdf,text/plain"
          className="mt-1.5 block w-full text-xs text-brand-gray"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-brand-body mb-1">
          Transcription de l&apos;entretien — coller le texte ou déposer un
          fichier (.txt)
        </label>
        <textarea
          name="transcriptText"
          rows={8}
          placeholder="Collez ici la transcription de l'entretien…"
          className="input"
        />
        <input
          type="file"
          name="transcriptFile"
          accept=".txt,text/plain"
          className="mt-1.5 block w-full text-xs text-brand-gray"
        />
      </div>

      {state.error && (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-brand-ink py-2.5 text-sm font-medium text-white hover:bg-brand-blue-dark disabled:opacity-60"
      >
        {pending ? "Génération en cours… (peut prendre une minute)" : "Générer le dossier"}
      </button>
    </form>
  );
}
