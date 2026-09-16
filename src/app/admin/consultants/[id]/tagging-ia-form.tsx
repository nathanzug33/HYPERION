"use client";

import { useState } from "react";
import { useActionState } from "react";
import { applyTaggingIaAction, type TaggingState } from "./dc-actions";

const initialState: TaggingState = {};

const ACCEPT_CV =
  ".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const FILE_INPUT_CLASS =
  "mt-1 block w-full rounded-lg border border-dashed border-brand-blue-light/60 bg-brand-blue-bg-soft/40 px-3 py-2.5 text-xs text-brand-gray transition-colors hover:border-brand-blue file:mr-3 file:rounded-md file:border-0 file:bg-brand-blue file:px-3 file:py-1 file:text-xs file:font-medium file:text-white";
const SELECT_CLASS =
  "mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-brand-body";

type Fichier = { id: string; type: string; nomOriginal: string; createdAt: Date | string };

const NOUVEAU = "__nouveau__";

export default function TaggingIaForm({
  consultantId,
  fichiers,
}: {
  consultantId: string;
  fichiers: Fichier[];
}) {
  const sources = fichiers.filter((f) => f.type === "CV" || f.type === "DC");
  const [state, formAction, pending] = useActionState(applyTaggingIaAction, initialState);
  const [choix, setChoix] = useState<string>(sources[0]?.id ?? NOUVEAU);

  return (
    <div className="space-y-3">
      <p className="text-xs text-brand-gray">
        Relit un CV ou un DC déjà en ligne (ou un nouveau dépôt) pour taguer
        uniquement les secteurs, expertises et compétences — n&apos;écrase ni
        l&apos;identité, ni le résumé, ni les langues, formations ou
        expériences.
      </p>
      <form
        action={formAction}
        onSubmit={(e) => {
          if (
            !window.confirm(
              "Remplacer les secteurs, expertises et compétences actuels par le résultat du tagging IA ?"
            )
          ) {
            e.preventDefault();
          }
        }}
        className="space-y-3"
      >
        <input type="hidden" name="id" value={consultantId} />
        <div>
          <label className="block text-[11px] text-brand-gray">Source (CV / DC)</label>
          <select
            name="fichierId"
            value={choix}
            onChange={(e) => setChoix(e.target.value)}
            className={SELECT_CLASS}
          >
            {sources.length === 0 && <option value="">Aucun fichier en ligne</option>}
            {sources.map((f) => (
              <option key={f.id} value={f.id}>
                {f.type} — {f.nomOriginal} ({new Date(f.createdAt).toLocaleDateString("fr-FR")})
              </option>
            ))}
            <option value={NOUVEAU}>➕ Déposer un nouveau fichier…</option>
          </select>
        </div>
        {choix === NOUVEAU && (
          <div>
            <label className="block text-[11px] text-brand-gray">Fichier à déposer</label>
            <input type="file" name="cvFile" accept={ACCEPT_CV} className={FILE_INPUT_CLASS} />
          </div>
        )}
        {state.error && <p className="text-xs text-red-600">{state.error}</p>}
        {state.success && (
          <p className="text-xs font-medium text-brand-green">
            ✅ Tagging appliqué — voir les onglets Compétences / Secteurs.
          </p>
        )}
        <button
          type="submit"
          disabled={pending || (sources.length === 0 && choix !== NOUVEAU)}
          className="btn btn-secondary w-full"
        >
          {pending ? "Analyse en cours…" : "Lancer le tagging IA"}
        </button>
      </form>
    </div>
  );
}
