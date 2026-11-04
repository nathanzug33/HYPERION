"use client";

import { useState } from "react";
import { uploadFileDirect, type PreparedUpload } from "@/lib/cv-upload-client";

const ACCEPT_CV =
  ".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

type RequestUpload = (
  filename: string
) => Promise<PreparedUpload | { error: string }>;

/** Champ CV envoyé directement du navigateur vers Supabase Storage (voir
 * src/lib/cv-upload-client.ts) — jamais via la Server Action du formulaire
 * englobant, pour rester sous la limite de 4,5 Mo que Vercel impose au
 * corps d'une requête Server Action. `requestUpload` est la Server Action
 * (ex. requestCvUploadAction) qui réserve l'emplacement et le jeton
 * d'upload ; une fois l'envoi terminé, le nom stocké et le nom original
 * sont exposés via deux champs cachés (`${name}StoredName`/`${name}OriginalName`)
 * que le formulaire englobant soumet normalement. */
type UploadStatus = "idle" | "uploading" | "done" | "error";

export default function CvUploadField({
  name = "cv",
  label = "CV (optionnel)",
  requestUpload,
  helpText = "Peut aussi être ajouté ou remplacé plus tard depuis la fiche.",
  inputClassName,
  required,
  onStatusChange,
}: {
  name?: string;
  label?: string;
  requestUpload: RequestUpload;
  helpText?: string;
  inputClassName?: string;
  required?: boolean;
  /** Pour un formulaire où le CV est obligatoire (ex. génération IA) :
   * permet au parent de ne pas autoriser la soumission tant que l'upload
   * n'est pas terminé ("done"), puisque le <input type=file> natif n'est
   * plus ce qui porte la valeur réellement soumise. */
  onStatusChange?: (status: UploadStatus) => void;
}) {
  const [status, setStatusState] = useState<UploadStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ storedName: string; originalName: string } | null>(null);

  function setStatus(next: UploadStatus) {
    setStatusState(next);
    onStatusChange?.(next);
  }

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setResult(null);
    setError(null);
    if (!file) {
      setStatus("idle");
      return;
    }
    setStatus("uploading");
    try {
      const prepared = await requestUpload(file.name);
      if ("error" in prepared) {
        setStatus("error");
        setError(prepared.error);
        return;
      }
      const res = await uploadFileDirect(file, prepared);
      if (!res.ok) {
        setStatus("error");
        setError(res.error);
        return;
      }
      setResult({ storedName: prepared.storedName, originalName: prepared.originalName });
      setStatus("done");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Échec de l'envoi.");
    }
  }

  return (
    <div>
      <label className="block text-xs font-medium text-brand-body">{label}</label>
      <input
        type="file"
        accept={ACCEPT_CV}
        onChange={handleChange}
        required={required}
        disabled={status === "uploading"}
        className={
          inputClassName ??
          "mt-1.5 block w-full rounded-lg border border-dashed border-brand-blue-light/60 bg-brand-blue-bg-soft/40 px-3 py-3 text-xs text-brand-gray transition-colors hover:border-brand-blue file:mr-3 file:rounded-md file:border-0 file:bg-brand-blue file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-white disabled:opacity-60"
        }
      />
      {status === "uploading" && (
        <p className="mt-1 text-xs text-brand-gray">Envoi du CV en cours…</p>
      )}
      {status === "error" && <p className="mt-1 text-xs text-red-600">{error}</p>}
      {status === "done" && result && (
        <p className="mt-1 text-xs text-brand-green">✓ {result.originalName}</p>
      )}
      {helpText && status !== "error" && (
        <p className="mt-1 text-xs text-brand-gray">{helpText}</p>
      )}
      <input type="hidden" name={`${name}StoredName`} value={result?.storedName ?? ""} />
      <input type="hidden" name={`${name}OriginalName`} value={result?.originalName ?? ""} />
    </div>
  );
}
