"use client";

import { useEffect, useRef, useState } from "react";

type FichierRef = { id: string; nomOriginal: string };

function extensionOf(name: string): string {
  return name.split(".").pop()?.toLowerCase() ?? "";
}

/** Aperçu en place (modale) d'une pièce jointe, sans téléchargement forcé :
 * PDF via le rendu natif du navigateur (iframe), .docx rendu côté client
 * (docx-preview, aucune conversion serveur), .txt affiché tel quel — le
 * format .doc (binaire legacy) n'a pas d'aperçu possible sans conversion
 * serveur, on propose alors directement le téléchargement. */
export default function FichierPreviewModal({
  consultantId,
  fichier,
  onClose,
}: {
  consultantId: string;
  fichier: FichierRef | null;
  onClose: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [text, setText] = useState("");

  const ext = fichier ? extensionOf(fichier.nomOriginal) : "";
  const url = fichier ? `/admin/consultants/${consultantId}/fichiers/${fichier.id}` : "";

  useEffect(() => {
    if (!fichier) return;
    setState("loading");
    setText("");
    if (containerRef.current) containerRef.current.innerHTML = "";

    let cancelled = false;

    (async () => {
      try {
        if (ext === "pdf") {
          if (!cancelled) setState("ready"); // rendu par l'iframe, rien à charger ici
          return;
        }
        if (ext === "docx") {
          const res = await fetch(url);
          if (!res.ok) throw new Error("fetch failed");
          const blob = await res.blob();
          const { renderAsync } = await import("docx-preview");
          if (cancelled || !containerRef.current) return;
          await renderAsync(blob, containerRef.current, undefined, {
            inWrapper: false,
            ignoreWidth: true,
            ignoreHeight: true,
          });
          if (!cancelled) setState("ready");
          return;
        }
        if (ext === "txt") {
          const res = await fetch(url);
          if (!res.ok) throw new Error("fetch failed");
          const t = await res.text();
          if (!cancelled) {
            setText(t);
            setState("ready");
          }
          return;
        }
        if (!cancelled) setState("error"); // .doc et autres : pas d'aperçu possible
      } catch {
        if (!cancelled) setState("error");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [fichier, ext, url]);

  if (!fichier) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
          <h3 className="truncate text-sm font-semibold text-brand-ink">{fichier.nomOriginal}</h3>
          <div className="flex shrink-0 items-center gap-3">
            <a
              href={`${url}?disposition=attachment`}
              className="link-underline text-xs text-brand-blue-dark"
            >
              ⬇️ Télécharger
            </a>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fermer"
              className="text-brand-gray hover:text-brand-ink"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto bg-slate-50">
          {ext === "pdf" && (
            <iframe src={url} title={fichier.nomOriginal} className="h-[75vh] w-full border-0" />
          )}

          {ext === "docx" && (
            <div className="bg-white p-4">
              {state === "loading" && (
                <p className="p-6 text-center text-xs text-brand-gray">Chargement de l&apos;aperçu…</p>
              )}
              {state === "error" && (
                <p className="p-6 text-center text-xs text-red-600">
                  Impossible de charger l&apos;aperçu — utilisez « Télécharger ».
                </p>
              )}
              <div ref={containerRef} />
            </div>
          )}

          {ext === "txt" && (
            <pre className="whitespace-pre-wrap p-4 text-xs text-brand-body">
              {state === "loading"
                ? "Chargement…"
                : state === "error"
                  ? "Impossible de charger l'aperçu."
                  : text}
            </pre>
          )}

          {ext !== "pdf" && ext !== "docx" && ext !== "txt" && (
            <p className="p-6 text-center text-xs text-brand-gray">
              Aperçu non disponible pour ce format ({ext ? `.${ext}` : "inconnu"}) — utilisez
              « Télécharger ».
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
