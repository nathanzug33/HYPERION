// Matching candidat <-> interlocuteur CRM par mots-clés de poste. Contrairement
// à computeMatchScore (secteurs/expertises recherchés, structurés), ce signal
// s'appuie sur Contact.fonction, un champ libre ("Responsable Data",
// "Directeur des Systèmes d'Information"…) — le seul souvent disponible pour
// un prospect froid qui n'a pas encore exprimé de besoin structuré. On
// rapproche ces mots-clés de l'intitulé de poste et des secteurs/expertises
// du candidat.

const STOPWORDS = new Set([
  "les", "des", "une", "aux", "pour", "chez", "dans", "sur", "par", "avec",
  "du", "de", "la", "le", "et", "ou", "en", "au", "un", "responsable",
  "directeur", "directrice", "chef", "manager", "adjoint", "adjointe",
  "senior", "junior", "principal", "general", "generale",
]);

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, " ");
}

function extractKeywords(s: string | null | undefined): string[] {
  if (!s) return [];
  const words = normalize(s)
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w));
  return Array.from(new Set(words));
}

/** Ensemble de mots-clés caractérisant un candidat (poste + libellés
 * secteurs/expertises) — à calculer une fois par candidat puis à comparer à
 * chaque Contact.fonction. */
export function buildCandidateKeywords(input: {
  intitulePoste: string | null;
  secteurLabels: string[];
  expertiseLabels: string[];
}): string[] {
  return Array.from(
    new Set([
      ...extractKeywords(input.intitulePoste),
      ...input.secteurLabels.flatMap(extractKeywords),
      ...input.expertiseLabels.flatMap(extractKeywords),
    ])
  );
}

export type FonctionMatch = { score: number; mots: string[] };

/** Score un Contact.fonction par rapport aux mots-clés d'un candidat
 * (inclusion simple, normalisée — pas de stemming). */
export function scoreFonctionMatch(
  fonction: string | null | undefined,
  candidateKeywords: string[]
): FonctionMatch {
  if (!fonction || candidateKeywords.length === 0) return { score: 0, mots: [] };
  const fn = normalize(fonction);
  const mots = candidateKeywords.filter((kw) => fn.includes(kw));
  return { score: mots.length * 3, mots };
}
