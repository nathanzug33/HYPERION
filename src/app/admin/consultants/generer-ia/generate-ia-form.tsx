"use client";

import { useActionState } from "react";
import { generateConsultantFromAI, type GenerateIaState } from "./actions";

const initialState: GenerateIaState = {};

const ACCEPT =
  ".pdf,.doc,.docx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain";

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
    <form action={formAction} className="card space-y-5 p-5">
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
          CV ou dossier existant (obligatoire)
        </label>
        <input
          type="file"
          name="cvFile"
          required
          accept={ACCEPT}
          className="block w-full rounded-lg border border-dashed border-brand-blue-light/60 bg-brand-blue-bg-soft/40 px-3 py-3 text-xs text-brand-gray transition-colors hover:border-brand-blue file:mr-3 file:rounded-md file:border-0 file:bg-brand-blue file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-white"
        />
        <p className="mt-1 text-xs text-brand-gray">
          Un CV brut ou un dossier déjà rédigé par une autre société, dans un
          autre format que le gabarit HYPERION — les deux fonctionnent.
        </p>
      </div>

      <div>
        <label className="block text-xs font-medium text-brand-body mb-1">
          Transcription de l&apos;entretien (facultatif)
        </label>
        <input
          type="file"
          name="transcriptFile"
          accept={ACCEPT}
          className="block w-full rounded-lg border border-dashed border-brand-blue-light/60 bg-brand-blue-bg-soft/40 px-3 py-3 text-xs text-brand-gray transition-colors hover:border-brand-blue file:mr-3 file:rounded-md file:border-0 file:bg-brand-blue file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-white"
        />
        <p className="mt-1 text-xs text-brand-gray">
          Pas encore d&apos;entretien, ou dossier reçu directement du
          candidat ? Laissez ce champ vide, l&apos;IA travaillera à partir du
          CV seul.
        </p>
      </div>

      {state.error && (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="btn btn-primary w-full py-2.5 disabled:opacity-60"
      >
        {pending ? "Génération en cours… (peut prendre une minute)" : "Générer le dossier"}
      </button>
    </form>
  );
}
