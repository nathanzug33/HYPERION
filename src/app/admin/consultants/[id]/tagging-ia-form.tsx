"use client";

import { useActionState } from "react";
import { previewDcFromIaAction, applyDcFromIaAction, type DcPreviewState } from "./dc-actions";

const initialState: DcPreviewState = {};

const ACCEPT_CV =
  ".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const ACCEPT_TRANSCRIPT = `${ACCEPT_CV},.txt,text/plain`;
const FILE_INPUT_CLASS =
  "mt-1 block w-full rounded-lg border border-dashed border-brand-blue-light/60 bg-brand-blue-bg-soft/40 px-3 py-2.5 text-xs text-brand-gray transition-colors hover:border-brand-blue file:mr-3 file:rounded-md file:border-0 file:bg-brand-blue file:px-3 file:py-1 file:text-xs file:font-medium file:text-white";

function DiffRow({
  label,
  before,
  after,
}: {
  label: string;
  before: string;
  after: string;
}) {
  const changed = before !== after;
  return (
    <div className="rounded-lg border border-slate-100 px-2.5 py-2 text-xs">
      <div className="font-medium text-brand-ink">{label}</div>
      <div className={changed ? "mt-1 text-brand-gray line-through" : "mt-1 text-brand-body"}>
        {before || "—"}
      </div>
      {changed && <div className="mt-0.5 font-medium text-brand-green">→ {after || "—"}</div>}
    </div>
  );
}

export default function TaggingIaForm({ consultantId }: { consultantId: string }) {
  const [previewState, previewAction, previewing] = useActionState(
    previewDcFromIaAction,
    initialState
  );
  const [applyState, applyAction, applying] = useActionState(applyDcFromIaAction, initialState);

  const preview = applyState.preview ?? previewState.preview;
  const error = applyState.error ?? previewState.error;

  if (preview) {
    const rows = [
      { label: "Nom", before: preview.before.nom, after: preview.after.nom ?? preview.before.nom },
      {
        label: "Prénom",
        before: preview.before.prenom,
        after: preview.after.prenom ?? preview.before.prenom,
      },
      {
        label: "Téléphone",
        before: preview.before.telephone ?? "",
        after: preview.after.telephone ?? preview.before.telephone ?? "",
      },
      {
        label: "Email",
        before: preview.before.email ?? "",
        after: preview.after.email ?? preview.before.email ?? "",
      },
      {
        label: "Résumé de contexte",
        before: preview.before.resumeContexte ?? "",
        after: preview.after.resumeContexte ?? preview.before.resumeContexte ?? "",
      },
    ];
    const hasChanges = rows.some((r) => r.before !== r.after);

    return (
      <div className="space-y-3">
        <p className="text-xs text-brand-gray">
          Aperçu des champs identité avant application — le reste du tagging
          (secteurs, expertises, compétences, formations, expériences) sera
          intégralement remplacé par le contenu généré depuis le CV, comme à
          chaque tagging IA.
        </p>
        <div className="space-y-1.5">
          {rows.map((r) => (
            <DiffRow key={r.label} label={r.label} before={r.before} after={r.after} />
          ))}
        </div>
        {!hasChanges && (
          <p className="text-[11px] text-brand-gray">
            Aucun changement détecté sur les champs identité.
          </p>
        )}
        {error && <p className="text-xs text-red-600">{error}</p>}
        <form action={applyAction}>
          <input type="hidden" name="payload" value={preview.payload} />
          <button type="submit" disabled={applying} className="btn btn-primary w-full">
            {applying ? "Application…" : "Confirmer et appliquer"}
          </button>
        </form>
        <p className="text-center text-[11px] text-brand-gray">
          Pour annuler, fermez cette fenêtre (✕) — rien n&apos;est encore enregistré.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-brand-gray">
        Relit le CV déjà enregistré (ou celui déposé ci-dessous) et, si
        fournie, une transcription d&apos;entretien, pour proposer un nouveau
        tagging : identité, profil, mobilité, compétences, secteurs,
        formations et expériences. Un aperçu (avant/après) des champs
        identité s&apos;affiche avant toute application — la saisie manuelle
        reste possible à tout moment, avant ou après.
      </p>
      <form action={previewAction} className="space-y-3">
        <input type="hidden" name="id" value={consultantId} />
        <div>
          <label className="block text-[11px] text-brand-gray">
            Remplacer le CV utilisé (optionnel)
          </label>
          <input type="file" name="cvFile" accept={ACCEPT_CV} className={FILE_INPUT_CLASS} />
        </div>
        <div>
          <label className="block text-[11px] text-brand-gray">
            Transcription d&apos;entretien (optionnel)
          </label>
          <input
            type="file"
            name="transcriptFile"
            accept={ACCEPT_TRANSCRIPT}
            className={FILE_INPUT_CLASS}
          />
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
        <button type="submit" disabled={previewing} className="btn btn-secondary w-full">
          {previewing ? "Analyse en cours…" : "Analyser (aperçu avant application)"}
        </button>
      </form>
    </div>
  );
}
