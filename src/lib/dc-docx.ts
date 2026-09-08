import { readFile } from "node:fs/promises";
import path from "node:path";
import JSZip from "jszip";
import type { Prisma } from "@prisma/client";
import { NIVEAU_LABELS } from "@/lib/constants";
import { formatDuree, formatMoisAnnee } from "@/lib/experience-format";

// ---------------------------------------------------------------------------
// Génère le DC en remplissant DIRECTEMENT le fichier Word officiel HYPERION
// (src/lib/templates/hyperion-dc-template.docx), sans jamais le reconstruire :
// logo, encadrés, couleurs, styles et pied de page restent strictement ceux
// du fichier fourni par HYPERION Group.
//
// Les sections à cardinalité variable (expériences clés, formations,
// langues, expériences détaillées) sont dupliquées dynamiquement à partir
// d'UNE cellule/ligne/bloc de paragraphes « modèle » repérée dans le
// gabarit : un junior avec une seule expérience n'obtient qu'un seul bloc,
// un profil avec 6 langues obtient 6 colonnes — aucune limite arbitraire.
// Chaque section est localisée par un texte-ancre unique du gabarit
// (ex. « [Diplôme / intitulé de la formation] ») puis découpée/remplacée
// par découpage de chaîne, jamais par une ré-écriture DOM complète : le
// reste du document n'est jamais touché.
// ---------------------------------------------------------------------------

const TEMPLATE_PATH = path.join(process.cwd(), "src/lib/templates/hyperion-dc-template.docx");

export const dcConsultantInclude = {
  seniority: true,
  secteurs: { include: { secteur: true } },
  expertises: { include: { expertise: true } },
  competences: { include: { competence: true } },
  typesMobilite: { include: { typeMobilite: true } },
  zonesGeographiques: { include: { zoneGeographique: true } },
  langues: { include: { langue: true } },
  competenceCategories: { orderBy: { ordre: "asc" } },
  formations: { orderBy: { ordre: "asc" } },
  experiences: { orderBy: { ordre: "asc" } },
} satisfies Prisma.ConsultantInclude;

export type DcConsultant = Prisma.ConsultantGetPayload<{
  include: typeof dcConsultantInclude;
}>;

// --- Utilitaires XML génériques --------------------------------------------

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\r?\n/g, " ");
}

type Span = { start: number; end: number; xml: string };

/** Extrait toutes les occurrences d'une balise non imbriquée (w:tr, w:tc, w:p, w:t…). */
function extractTags(xml: string, tag: string): Span[] {
  const re = new RegExp(`<${tag}\\b[^>]*\\/>|<${tag}\\b[^>]*>[\\s\\S]*?<\\/${tag}>`, "g");
  const out: Span[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) {
    out.push({ start: m.index, end: m.index + m[0].length, xml: m[0] });
  }
  return out;
}

/** Remplace séquentiellement le contenu des <w:t> d'un fragment ; `null` = ne pas toucher. */
function fillSequentialText(fragment: string, values: (string | null)[]): string {
  let i = 0;
  return fragment.replace(/<w:t\b[^>]*\/>|<w:t\b[^>]*>[\s\S]*?<\/w:t>/g, (fullMatch) => {
    const value = i < values.length ? values[i] : undefined;
    i++;
    if (value === null || value === undefined) return fullMatch;
    const isSelfClosing = /\/>$/.test(fullMatch);
    const openTagEnd = isSelfClosing ? fullMatch.length - 2 : fullMatch.indexOf(">") + 1;
    const openTag = isSelfClosing
      ? fullMatch.slice(0, openTagEnd) + ">"
      : fullMatch.slice(0, openTagEnd);
    return `${openTag}${xmlEscape(value)}</w:t>`;
  });
}

/** Remplace la valeur w:w d'un <w:tcW .../> (largeur de cellule de tableau). */
function setCellWidth(cellXml: string, widthDxa: number): string {
  return cellXml.replace(/(<w:tcW\b[^>]*\bw:w=")\d+(")/, `$1${Math.round(widthDxa)}$2`);
}

function niveauText(niveau: number | null | undefined, label?: string | null): string {
  if (niveau == null) return "";
  const n = Math.max(0, Math.min(5, niveau));
  const dots = "●".repeat(n) + "○".repeat(5 - n);
  return `${dots}  ${label ?? NIVEAU_LABELS[n] ?? ""}`;
}

const DISPONIBILITE_FULL: Record<string, string> = {
  IMMEDIATE: "Disponible : immédiatement",
  SOUS_1_MOIS: "Disponible : sous 1 mois",
  SOUS_2_MOIS: "Disponible : sous 2 mois",
  SUR_PREAVIS: "Disponible : sur préavis",
};

// --- 01 — Expériences clés (cellules dupliquées, 1 par expérience) --------

function fillExpClesSection(xml: string, experiences: DcConsultant["experiences"]): string {
  const anchor = "[Depuis X mois]";
  const rows = extractTags(xml, "w:tr");
  const row = rows.find((r) => r.xml.includes(anchor));
  if (!row) return xml; // gabarit modifié / section absente : on ne casse rien

  const cells = extractTags(row.xml, "w:tc");
  if (cells.length === 0) return xml;
  const cellTemplate = cells[0].xml;
  const totalWidth = cells.reduce((sum, c) => {
    const m = /<w:tcW\b[^>]*\bw:w="(\d+)"/.exec(c.xml);
    return sum + (m ? Number(m[1]) : 0);
  }, 0);

  const items = experiences.slice(0, 12); // garde-fou raisonnable, pas de vraie limite métier
  const width = items.length > 0 ? totalWidth / items.length : totalWidth;

  const newCells = items
    .map((exp) => {
      const values = [
        exp.dateDebut ? String(exp.dateDebut.getFullYear()) : "",
        null, // tabulation
        formatDuree(exp.dateDebut, exp.dateFin),
        exp.missionTitre,
        exp.entreprise,
      ];
      return setCellWidth(fillSequentialText(cellTemplate, values), width);
    })
    .join("");

  const newRowXml = row.xml.slice(0, cells[0].start) + newCells + row.xml.slice(cells[cells.length - 1].end);
  return xml.slice(0, row.start) + newRowXml + xml.slice(row.end);
}

// --- 03 — Formations & certifications (lignes dupliquées) ------------------

function fillFormationsSection(xml: string, formations: DcConsultant["formations"]): string {
  const anchor = "[Diplôme / intitulé de la formation]";
  const rows = extractTags(xml, "w:tr").filter(
    (r) => r.xml.includes(anchor) || r.xml.includes("[Certification (ex.")
  );
  if (rows.length === 0) return xml;

  const rowTemplate = rows[0].xml;
  const newRows = formations
    .map((f) =>
      fillSequentialText(rowTemplate, [f.annee, f.intitule, null, f.etablissement ?? ""])
    )
    .join("");

  const start = rows[0].start;
  const end = rows[rows.length - 1].end;
  return xml.slice(0, start) + newRows + xml.slice(end);
}

// --- 04 — Langues (cellules dupliquées, 1 par langue) -----------------------

function fillLanguesSection(xml: string, langues: DcConsultant["langues"]): string {
  const anchor = "[Langue maternelle]";
  const rows = extractTags(xml, "w:tr");
  const row = rows.find((r) => r.xml.includes(anchor));
  if (!row) return xml;

  const cells = extractTags(row.xml, "w:tc");
  if (cells.length === 0) return xml;
  const cellTemplate = cells[0].xml;
  const totalWidth = cells.reduce((sum, c) => {
    const m = /<w:tcW\b[^>]*\bw:w="(\d+)"/.exec(c.xml);
    return sum + (m ? Number(m[1]) : 0);
  }, 0);

  const items = langues.slice(0, 12);
  const width = items.length > 0 ? totalWidth / items.length : totalWidth;

  const newCells = items
    .map((l) => {
      const values = [l.langue.label, null, niveauText(l.niveau), l.detail ?? ""];
      return setCellWidth(fillSequentialText(cellTemplate, values), width);
    })
    .join("");

  const newRowXml = row.xml.slice(0, cells[0].start) + newCells + row.xml.slice(cells[cells.length - 1].end);
  return xml.slice(0, row.start) + newRowXml + xml.slice(row.end);
}

// --- 02 — Compétences (5 lignes fixes, mapping direct) ----------------------

const COMPETENCE_ANCHORS: Record<string, string> = {
  DOMAINES: "[Ex. conception mécanique, calcul, développement back-end, data…]",
  LOGICIELS_OUTILS: "[Ex. CATIA V5, Ansys, Teamcenter — ou Python, Spark, AWS, Git…]",
  METHODES_NORMES: "[Ex. ISO GPS, EN 9100, Lean / Six Sigma, Scrum, ISO 27001…]",
  SECTEURS: "[Ex. aéronautique, énergie, automobile, chimie, banque…]",
  MANAGEMENT: "[Ex. équipe de X personnes, pilotage de projet, relation client…]",
};

function fillCompetencesSection(
  xml: string,
  categories: DcConsultant["competenceCategories"]
): string {
  const byType = new Map(categories.map((c) => [c.categorie, c]));

  for (const [categorie, anchor] of Object.entries(COMPETENCE_ANCHORS)) {
    const cat = byType.get(categorie);
    const idx = xml.indexOf(anchor);
    if (idx === -1) continue;

    // Remplace le contenu (l'ancre elle-même).
    const contentValue = cat?.contenu ?? "";
    xml = xml.slice(0, idx) + xmlEscape(contentValue) + xml.slice(idx + anchor.length);

    // Le niveau (⟦LVL⟧●●●●●  Label) suit dans le <w:t> suivant (marqueur
    // unique par catégorie : on le repère directement plutôt que de borner
    // arbitrairement la recherche du prochain nœud <w:t>).
    const after = idx + xmlEscape(contentValue).length;
    const lvlIdx = xml.indexOf("⟦LVL⟧", after);
    if (lvlIdx !== -1) {
      const tagOpenStart = xml.lastIndexOf("<w:t", lvlIdx);
      const tagOpenEnd = xml.indexOf(">", tagOpenStart) + 1;
      const tagClose = xml.indexOf("</w:t>", lvlIdx);
      if (tagOpenStart !== -1 && tagClose !== -1) {
        const value = cat ? niveauText(cat.niveau) : "";
        xml = xml.slice(0, tagOpenEnd) + xmlEscape(value) + xml.slice(tagClose);
      }
    }
  }
  return xml;
}

// --- 05 — Expériences détaillées (blocs de paragraphes dupliqués) ----------

function fillExperiencesDetailleesSection(
  xml: string,
  experiences: DcConsultant["experiences"]
): string {
  const heading = xml.indexOf("Expériences détaillées");
  if (heading === -1) return xml;

  const paras = extractTags(xml, "w:p").filter((p) => p.start > heading);

  // Le paragraphe d'aide interne du gabarit ("Quatre blocs sont prévus…")
  // est retiré : ce n'est pas un placeholder de données.
  const noteIdx = paras.findIndex((p) => p.xml.includes("Quatre blocs sont prévus"));

  // Chaque bloc commence à un paragraphe contenant "[Entreprise cliente]".
  const blockStarts = paras
    .map((p, i) => (p.xml.includes("[Entreprise cliente]") ? i : -1))
    .filter((i) => i >= 0);
  if (blockStarts.length === 0) return xml;

  const blockLength = blockStarts.length > 1 ? blockStarts[1] - blockStarts[0] : 11;
  const firstBlockParas = paras.slice(blockStarts[0], blockStarts[0] + blockLength);

  // Dans le bloc modèle : retire les marqueurs internes ⟦B⟧/⟦/B⟧ et ne
  // garde qu'UN paragraphe de réalisation (qui sert à son tour de modèle,
  // dupliqué une fois par réalisation réelle).
  const realisationIdxs = firstBlockParas
    .map((p, i) => (/\[Réalisation \d/.test(p.xml) ? i : -1))
    .filter((i) => i >= 0);
  const markerIdxs = firstBlockParas
    .map((p, i) => (/⟦\/?B⟧/.test(p.xml) ? i : -1))
    .filter((i) => i >= 0);
  const skip = new Set([...markerIdxs, ...realisationIdxs.slice(1)]);
  const realisationTemplateIdx = realisationIdxs[0];

  const blockTemplateParas = firstBlockParas.filter((_, i) => !skip.has(i));
  const blockTemplateXml = blockTemplateParas.map((p) => p.xml).join("");
  const realisationTemplateXml = firstBlockParas[realisationTemplateIdx]?.xml ?? "";

  function fillBlock(exp: DcConsultant["experiences"][number]): string {
    const realisations = (exp.realisations ?? "").split("\n").filter(Boolean);
    const realisationsXml =
      realisations.length > 0
        ? realisations
            .map((r) => fillSequentialText(realisationTemplateXml, [r]))
            .join("")
        : ""; // aucune réalisation renseignée : le paragraphe disparaît, rien d'affiché plutôt qu'un champ vide

    let block = blockTemplateXml.replace(realisationTemplateXml, " REALISATIONS ");

    // fillSequentialText opère sur l'ensemble du bloc (hors zone réalisations,
    // neutralisée ci-dessus) : le nombre de <w:t> restants correspond à
    // l'ordre entreprise/dateRange/duree/secteur/mission/contexte/« Réalisations »
    // (libellé)/env — deux libellés fixes ("Réalisations" et "Environnement
    // technique : ") occupent chacun leur propre nœud <w:t> juste avant la
    // valeur d'environnement, d'où les deux `null` consécutifs en fin de liste.
    block = fillSequentialText(block, [
      exp.entreprise,
      null,
      `${formatMoisAnnee(exp.dateDebut)} à ${formatMoisAnnee(exp.dateFin)}`,
      null,
      formatDuree(exp.dateDebut, exp.dateFin),
      null,
      exp.secteurActivite ?? "",
      null,
      exp.missionTitre,
      null,
      exp.contexteObjectif ?? "",
      null,
      null,
      exp.environnementTechnique ?? "",
    ]);

    return block.replace(" REALISATIONS ", realisationsXml);
  }

  const newBlocks = experiences.map(fillBlock).join("");

  const spanStart = noteIdx >= 0 ? paras[noteIdx].start : paras[blockStarts[0]].start;
  const spanEnd = paras[blockStarts[blockStarts.length - 1] + blockLength - 1].end;

  return xml.slice(0, spanStart) + newBlocks + xml.slice(spanEnd);
}

// --- Header, statut, profil (placeholders simples, occurrence unique) ------

function fillSimplePlaceholders(xml: string, c: DcConsultant): string {
  const anneesLabel =
    c.anneesExperienceMin != null
      ? c.anneesExperienceMax != null && c.anneesExperienceMax !== c.anneesExperienceMin
        ? `${c.anneesExperienceMin}–${c.anneesExperienceMax} ans d'expérience`
        : `${c.anneesExperienceMin}+ ans d'expérience`
      : "";
  const compClesLabels = c.competences.filter((x) => x.estCle).map((x) => x.competence.label);
  const mobiliteLabel = [c.typesMobilite[0]?.typeMobilite.label, c.villeRattachementZoneLarge]
    .filter(Boolean)
    .join(" / ");

  const replacements: [string, string][] = [
    ["[Intitulé du poste / spécialité]", c.intitulePoste ?? ""],
    ["[Prénom NOM]", `${c.prenom} ${c.nom}`],
    ["[X] ans d'expérience", anneesLabel],
    ["[Disponible : immédiatement]", c.disponibilite ? DISPONIBILITE_FULL[c.disponibilite] ?? "" : ""],
    ["[Compétence clé 1]", compClesLabels[0] ?? ""],
    ["[Compétence clé 2]", compClesLabels[1] ?? ""],
    ["[Compétence clé 3]", compClesLabels[2] ?? ""],
    ["[Mobilité / Ville]", mobiliteLabel],
    ["[Junior / Confirmé / Senior / Expert]", c.seniority?.label ?? ""],
    [
      "[Résumez votre profil en 4 à 6 lignes : votre spécialité, vos secteurs, vos principales réalisations et ce que vous apportez à une équipe.]",
      c.resumeContexte ?? "",
    ],
  ];

  for (const [placeholder, value] of replacements) {
    xml = xml.replace(placeholder, xmlEscape(value));
  }
  return xml;
}

export async function buildDcDocx(c: DcConsultant): Promise<Buffer> {
  const templateBuffer = await readFile(TEMPLATE_PATH);
  const zip = await JSZip.loadAsync(templateBuffer);

  const documentXmlFile = zip.file("word/document.xml");
  if (!documentXmlFile) {
    throw new Error("Gabarit HYPERION invalide : word/document.xml introuvable.");
  }
  let xml = await documentXmlFile.async("string");

  // Sections dynamiques d'abord (chacune repérée par un texte-ancre propre
  // à elle, donc l'ordre de traitement n'a pas d'importance).
  xml = fillExpClesSection(xml, c.experiences);
  xml = fillFormationsSection(xml, c.formations);
  xml = fillLanguesSection(xml, c.langues);
  xml = fillExperiencesDetailleesSection(xml, c.experiences);
  xml = fillCompetencesSection(xml, c.competenceCategories);
  xml = fillSimplePlaceholders(xml, c);

  zip.file("word/document.xml", xml);
  return zip.generateAsync({ type: "nodebuffer" });
}
