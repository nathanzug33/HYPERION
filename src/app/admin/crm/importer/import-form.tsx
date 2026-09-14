"use client";

import { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { importCrmRowsAction, type ImportResult, type ImportRow } from "./actions";

type TargetField = {
  key: string;
  label: string;
  required?: boolean;
};

const TARGET_FIELDS: TargetField[] = [
  { key: "societeNom", label: "Société", required: true },
  { key: "ville", label: "Ville" },
  { key: "siteWeb", label: "Site web" },
  { key: "contactNomComplet", label: "Contact — nom complet (1 seule colonne)" },
  { key: "prenom", label: "Contact — prénom (colonne séparée)" },
  { key: "nom", label: "Contact — nom (colonne séparée)" },
  { key: "fonction", label: "Fonction du contact" },
  { key: "email", label: "Email du contact" },
  { key: "telephone", label: "Téléphone du contact" },
];

const GUESSES: Record<string, string[]> = {
  societeNom: ["societe", "entreprise", "client", "raisonsociale", "company", "nomsociete", "nomentreprise"],
  siteWeb: ["siteweb", "site", "website", "url", "web"],
  ville: ["ville", "city", "localite"],
  contactNomComplet: ["contact", "interlocuteur", "nomcomplet"],
  prenom: ["prenom", "firstname"],
  nom: ["nom", "lastname"],
  fonction: ["fonction", "poste", "titre", "job", "role"],
  email: ["email", "mail", "courriel"],
  telephone: ["telephone", "tel", "phone", "mobile", "portable", "numero"],
};

// Ordre de priorité pour l'auto-détection : une colonne déjà retenue pour un
// champ n'est plus proposée pour les suivants (évite qu'une seule colonne
// "Nom" soit à la fois candidate pour la société et pour le contact).
const PRIORITE = [
  "societeNom",
  "siteWeb",
  "ville",
  "contactNomComplet",
  "prenom",
  "nom",
  "fonction",
  "email",
  "telephone",
];

function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function autoDetectMapping(headers: string[]): Record<string, string> {
  const used = new Set<string>();
  const mapping: Record<string, string> = {};
  for (const field of PRIORITE) {
    const keywords = GUESSES[field];
    const match = headers.find(
      (h) => !used.has(h) && keywords.some((k) => normalize(h).includes(k))
    );
    if (match) {
      mapping[field] = match;
      used.add(match);
    }
  }
  return mapping;
}

function buildRows(
  sheetRows: Record<string, unknown>[],
  mapping: Record<string, string>
): ImportRow[] {
  const get = (row: Record<string, unknown>, field: string): string => {
    const header = mapping[field];
    if (!header) return "";
    const value = row[header];
    return value == null ? "" : String(value).trim();
  };

  return sheetRows.map((row) => {
    let prenom = get(row, "prenom");
    let nom = get(row, "nom");
    const nomComplet = get(row, "contactNomComplet");
    if (nomComplet && (!prenom || !nom)) {
      const parts = nomComplet.split(/\s+/).filter(Boolean);
      if (!prenom) prenom = parts[0] ?? "";
      if (!nom) nom = parts.length > 1 ? parts.slice(1).join(" ") : "";
    }
    return {
      societeNom: get(row, "societeNom"),
      ville: get(row, "ville"),
      siteWeb: get(row, "siteWeb"),
      prenom,
      nom,
      fonction: get(row, "fonction"),
      email: get(row, "email"),
      telephone: get(row, "telephone"),
    };
  });
}

export default function ImportForm() {
  const [fileName, setFileName] = useState<string | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [sheetRows, setSheetRows] = useState<Record<string, unknown>[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const rowsApercu = useMemo(() => buildRows(sheetRows.slice(0, 8), mapping), [sheetRows, mapping]);
  const totalLignes = sheetRows.length;
  const societeMappee = Boolean(mapping.societeNom);

  async function handleFile(file: File) {
    setError(null);
    setResult(null);
    setFileName(file.name);
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
      if (rows.length === 0) {
        setError("Le fichier ne contient aucune ligne exploitable.");
        setHeaders([]);
        setSheetRows([]);
        return;
      }
      const detectedHeaders = Object.keys(rows[0]);
      setHeaders(detectedHeaders);
      setSheetRows(rows);
      setMapping(autoDetectMapping(detectedHeaders));
    } catch {
      setError("Impossible de lire ce fichier — vérifiez qu'il s'agit bien d'un .xlsx, .xls ou .csv.");
      setHeaders([]);
      setSheetRows([]);
    }
  }

  async function handleImport() {
    setSubmitting(true);
    setError(null);
    try {
      const rows = buildRows(sheetRows, mapping);
      const res = await importCrmRowsAction(rows);
      setResult(res);
    } catch {
      setError("L'import a échoué — réessayez, et contactez l'admin si ça persiste.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="card space-y-3 p-5">
        <label className="block text-xs font-medium text-brand-body">
          Fichier Excel ou CSV
        </label>
        <input
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
          }}
          className="block w-full text-xs text-brand-gray file:mr-2 file:rounded-md file:border-0 file:bg-brand-blue file:px-2 file:py-1 file:text-[11px] file:font-medium file:text-white"
        />
        {fileName && (
          <p className="text-xs text-brand-gray">
            {fileName} — {totalLignes} ligne{totalLignes > 1 ? "s" : ""} détectée{totalLignes > 1 ? "s" : ""}
          </p>
        )}
        {error && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
            {error}
          </p>
        )}
      </div>

      {headers.length > 0 && (
        <div className="card space-y-4 p-5">
          <div>
            <h2 className="text-sm font-semibold text-brand-ink">Correspondance des colonnes</h2>
            <p className="mt-1 text-xs text-brand-gray">
              Association proposée automatiquement — à vérifier et corriger si besoin.
              Seule la colonne « Société » est obligatoire.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {TARGET_FIELDS.map((field) => (
              <div key={field.key}>
                <label className="block text-xs font-medium text-brand-body">
                  {field.label}
                  {field.required && <span className="text-red-600"> *</span>}
                </label>
                <select
                  value={mapping[field.key] ?? ""}
                  onChange={(e) =>
                    setMapping((m) => ({ ...m, [field.key]: e.target.value }))
                  }
                  className="input mt-1 text-xs"
                >
                  <option value="">— Aucune —</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          {!societeMappee && (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              ⚠️ Associez une colonne à « Société » pour pouvoir importer.
            </p>
          )}

          <div>
            <h3 className="mb-1.5 text-xs font-semibold text-brand-ink">
              Aperçu ({Math.min(8, totalLignes)} premières lignes sur {totalLignes})
            </h3>
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-brand-gray">
                  <tr>
                    <th className="px-2 py-1.5">Société</th>
                    <th className="px-2 py-1.5">Ville</th>
                    <th className="px-2 py-1.5">Contact</th>
                    <th className="px-2 py-1.5">Fonction</th>
                    <th className="px-2 py-1.5">Email</th>
                    <th className="px-2 py-1.5">Téléphone</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rowsApercu.map((r, i) => (
                    <tr key={i}>
                      <td className="px-2 py-1.5 font-medium text-brand-ink">{r.societeNom || "—"}</td>
                      <td className="px-2 py-1.5 text-brand-body">{r.ville || "—"}</td>
                      <td className="px-2 py-1.5 text-brand-body">
                        {[r.prenom, r.nom].filter(Boolean).join(" ") || "—"}
                      </td>
                      <td className="px-2 py-1.5 text-brand-body">{r.fonction || "—"}</td>
                      <td className="px-2 py-1.5 text-brand-body">{r.email || "—"}</td>
                      <td className="px-2 py-1.5 text-brand-body">{r.telephone || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <button
            type="button"
            onClick={handleImport}
            disabled={!societeMappee || submitting}
            className="btn btn-primary w-full py-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "Import en cours…" : `Importer ${totalLignes} ligne${totalLignes > 1 ? "s" : ""}`}
          </button>
        </div>
      )}

      {result && (
        <div className="card space-y-1.5 border-l-4 border-l-brand-green p-5 text-sm">
          <p className="font-semibold text-brand-ink">✅ Import terminé</p>
          <p className="text-brand-body">
            {result.entreprisesCreees} société{result.entreprisesCreees > 1 ? "s" : ""} créée
            {result.entreprisesCreees > 1 ? "s" : ""}, {result.entreprisesReutilisees} déjà existante
            {result.entreprisesReutilisees > 1 ? "s" : ""} (contact ajouté dessus).
          </p>
          <p className="text-brand-body">
            {result.contactsCrees} contact{result.contactsCrees > 1 ? "s" : ""} créé
            {result.contactsCrees > 1 ? "s" : ""}, {result.contactsIgnores} ignoré
            {result.contactsIgnores > 1 ? "s" : ""} (doublon déjà présent).
          </p>
          {result.lignesIgnorees > 0 && (
            <p className="text-brand-gray">
              {result.lignesIgnorees} ligne{result.lignesIgnorees > 1 ? "s" : ""} ignorée
              {result.lignesIgnorees > 1 ? "s" : ""} (société manquante).
            </p>
          )}
        </div>
      )}
    </div>
  );
}
