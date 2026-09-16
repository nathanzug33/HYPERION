"use client";

import { useActionState } from "react";
import {
  previewGenererDcIaAction,
  applyGenererDcIaAction,
  type DcPreviewState,
} from "./dc-actions";

const initialState: DcPreviewState = {};

const ACCEPT_CV =
  ".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const ACCEPT_TRANSCRIPT = `${ACCEPT_CV},.txt,text/plain`;
const FILE_INPUT_CLASS =
  "mt-1 block w-full rounded-lg border border-dashed border-brand-blue-light/60 bg-brand-blue-bg-soft/40 px-3 py-2.5 text-xs text-brand-gray transition-colors hover:border-brand-blue file:mr-3 file:rounded-md file:border-0 file:bg-brand-blue file:px-3 file:py-1 file:text-xs file:font-medium file:text-white";
const SELECT_CLASS =
  "mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-brand-body";
const TEXTAREA_CLASS =
  "mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-brand-body";

type Fichier = { id: string; type: string; nomOriginal: string; createdAt: Date | string };

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

export default function GenererDcIaForm({
  consultantId,
  fichiers,
}: {
  consultantId: string;
  fichiers: Fichier[];
}) {
  const cvs = fichiers.filter((f) => f.type === "CV");
  const transcripts = fichiers.filter((f) => f.type === "TRANSCRIPT");

  const [previewState, previewAction, previewing] = useActionState(
    previewGenererDcIaAction,
    initialState
  );
  const [applyState, applyAction, applying] = useActionState(applyGenererDcIaAction, initialState);

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
          Aperçu des champs identité avant application — le reste du dossier
          (résumé, séniorité, mobilité, secteurs, expertises, compétences,
          langues, formations, expériences) sera intégralement remplacé par
          le contenu généré, puis un nouveau DC (Word) sera enregistré en
          pièce jointe.
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
            {applying ? "Application…" : "Confirmer et générer le DC"}
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
        Relit un CV + (optionnellement) un transcript d&apos;entretien pour
        régénérer l&apos;intégralité du dossier (identité, résumé, séniorité,
        mobilité, secteurs, compétences, langues, formations, expériences) et
        produire un nouveau DC (Word), conservé en pièce jointe. Un aperçu
        (avant/après) des champs identité s&apos;affiche avant application.
      </p>
      <form action={previewAction} className="space-y-3">
        <input type="hidden" name="id" value={consultantId} />

        <div>
          <label className="block text-[11px] text-brand-gray">CV à analyser</label>
          <select name="cvFichierId" defaultValue={cvs[0]?.id ?? ""} className={SELECT_CLASS}>
            {cvs.length === 0 && <option value="">Aucun CV en ligne</option>}
            {cvs.map((f) => (
              <option key={f.id} value={f.id}>
                {f.nomOriginal} ({new Date(f.createdAt).toLocaleDateString("fr-FR")})
              </option>
            ))}
          </select>
          <label className="mt-1.5 block text-[11px] text-brand-gray">
            …ou déposer un nouveau CV (remplace la sélection ci-dessus)
          </label>
          <input type="file" name="cvFile" accept={ACCEPT_CV} className={FILE_INPUT_CLASS} />
        </div>

        <div className="border-t border-slate-100 pt-3">
          <label className="block text-[11px] text-brand-gray">
            Transcript d&apos;entretien (optionnel)
          </label>
          <select
            name="transcriptFichierId"
            defaultValue={transcripts[0]?.id ?? ""}
            className={SELECT_CLASS}
          >
            <option value="">Aucun</option>
            {transcripts.map((f) => (
              <option key={f.id} value={f.id}>
                {f.nomOriginal} ({new Date(f.createdAt).toLocaleDateString("fr-FR")})
              </option>
            ))}
          </select>
          <label className="mt-1.5 block text-[11px] text-brand-gray">
            …ou déposer un nouveau fichier
          </label>
          <input
            type="file"
            name="transcriptFile"
            accept={ACCEPT_TRANSCRIPT}
            className={FILE_INPUT_CLASS}
          />
          <label className="mt-1.5 block text-[11px] text-brand-gray">
            …ou coller des notes tapées (prioritaire sur la sélection ci-dessus)
          </label>
          <textarea
            name="transcriptText"
            rows={3}
            placeholder="Notes prises pendant l'entretien..."
            className={TEXTAREA_CLASS}
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
