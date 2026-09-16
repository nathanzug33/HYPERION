// pdfjs-dist ne fournit pas de types pour ce sous-module (le worker
// "legacy" en .mjs) — importé dynamiquement dans src/lib/pdf-text.ts pour
// contourner l'échec de son propre import dynamique relatif sur Vercel.
declare module "pdfjs-dist/legacy/build/pdf.worker.mjs" {
  const WorkerMessageHandler: unknown;
  export { WorkerMessageHandler };
}
