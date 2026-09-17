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

/** Réajuste proportionnellement la position de la tabulation droite qui
 * sépare l'année de la durée (ex. « [2025]  →  Depuis 8 mois ») à la
 * nouvelle largeur de cellule. Sans ça, la position — calibrée pour la
 * largeur d'origine du gabarit (3 colonnes fixes) — tombe hors de la
 * cellule dès qu'il y a plus ou moins de 3 expériences (colonnes plus
 * étroites ou plus larges), et la durée se retrouve collée à l'année au
 * lieu d'être repoussée à droite. */
function rescaleTabStop(cellXml: string, originalWidth: number, newWidth: number): string {
  if (!originalWidth) return cellXml;
  const scale = newWidth / originalWidth;
  return cellXml.replace(
    /(<w:tab\b[^>]*\bw:pos=")(\d+)(")/,
    (_m, before: string, pos: string, after: string) => `${before}${Math.round(Number(pos) * scale)}${after}`
  );
}

/** Localise le <w:tblGrid> RÉELLEMENT actif (celui qui régit l'affichage) du
 * tableau juste avant `beforeIndex`, en tenant compte du niveau d'imbrication.
 * Certains exports (Google Docs notamment) enveloppent un <w:tblGridChange>
 * — historique de révision — DANS le <w:tblGrid> actif, et ce
 * <w:tblGridChange> contient lui-même sa propre copie complète de
 * <w:tblGrid> : un simple lastIndexOf("</w:tblGrid>") trouve alors cette
 * copie imbriquée (inerte, jamais utilisée pour le rendu) au lieu de la
 * grille active, et une réécriture ne modifierait que l'historique sans
 * effet visuel — la grille réellement affichée resterait sur son ancien
 * nombre de colonnes. */
function findActiveTblGrid(xml: string, beforeIndex: number): { start: number; end: number } | null {
  const tblStart = xml.lastIndexOf("<w:tbl>", beforeIndex);
  if (tblStart === -1) return null;
  const start = xml.indexOf("<w:tblGrid>", tblStart);
  if (start === -1 || start > beforeIndex) return null;

  let depth = 1;
  let pos = start + "<w:tblGrid>".length;
  while (depth > 0) {
    const nextOpen = xml.indexOf("<w:tblGrid>", pos);
    const nextClose = xml.indexOf("</w:tblGrid>", pos);
    if (nextClose === -1) return null;
    if (nextOpen !== -1 && nextOpen < nextClose) {
      depth++;
      pos = nextOpen + "<w:tblGrid>".length;
    } else {
      depth--;
      pos = nextClose + "</w:tblGrid>".length;
    }
  }
  return { start, end: pos };
}

/** Lit la largeur totale (et celle de la 1ʳᵉ colonne) déclarée par les
 * colonnes de premier niveau du <w:tblGrid> actif — jamais celles d'un
 * éventuel <w:tblGridChange> imbriqué (historique). C'est la source à
 * privilégier pour la largeur des colonnes : Word l'exige toujours, alors
 * que la largeur par cellule (<w:tcW>) est redondante et parfois absente
 * selon l'outil qui a produit le .docx (l'export Google Docs ne l'écrit
 * pas du tout, ne s'appuyant que sur le tblGrid). */
function readTblGridWidths(xml: string, beforeIndex: number): { total: number; first: number } {
  const span = findActiveTblGrid(xml, beforeIndex);
  if (!span) return { total: 0, first: 0 };
  const gridXml = xml.slice(span.start, span.end);
  const changeIdx = gridXml.indexOf("<w:tblGridChange");
  const liveXml = changeIdx === -1 ? gridXml : gridXml.slice(0, changeIdx);
  const widths = Array.from(liveXml.matchAll(/<w:gridCol\b[^>]*\bw:w="([\d.]+)"/g)).map((m) =>
    Number(m[1])
  );
  return { total: widths.reduce((sum, w) => sum + w, 0), first: widths[0] ?? 0 };
}

/** Réécrit le <w:tblGrid> actif (déclaration des largeurs de colonnes) qui
 * précède `beforeIndex` pour qu'il déclare exactement `columnCount`
 * colonnes — en repartant de zéro (un éventuel <w:tblGridChange> imbriqué
 * est purement informatif et n'a plus de sens une fois le nombre de
 * colonnes changé, il n'est pas reconduit). Le gabarit déclare un nombre de
 * colonnes fixe (3, pour 3 expériences/langues "type") : dès que le nombre
 * de cellules réellement généré diffère (plus ou moins de 3 éléments), la
 * grille déclarée et le contenu réel de la ligne désynchronisent — Word
 * "répare" cette incohérence en corrompant visuellement tout le document
 * (jusqu'au pied de page). */
function rewriteTblGridBefore(xml: string, beforeIndex: number, columnCount: number, colWidth: number): string {
  const span = findActiveTblGrid(xml, beforeIndex);
  if (!span) return xml;
  const gridCols = Array.from(
    { length: columnCount },
    () => `<w:gridCol w:w="${Math.round(colWidth)}"/>`
  ).join("");
  return xml.slice(0, span.start) + `<w:tblGrid>${gridCols}</w:tblGrid>` + xml.slice(span.end);
}

/** Insère une véritable tabulation (caractère, pas seulement le taquet
 * déclaré dans le <w:pPr>) entre le 1ᵉʳ et le 2ᵉ run d'un fragment, si elle
 * n'y est pas déjà — nécessaire avec le gabarit actuel (export Google Docs)
 * qui déclare le taquet (`<w:tabs><w:tab w:pos="…"/></w:tabs>`) sans jamais
 * insérer le caractère de tabulation lui-même, ce qui collerait sinon la
 * durée juste après l'année au lieu de la repousser au taquet. */
function ensureTabRun(fragment: string): string {
  if (/<w:tab\/>/.test(fragment)) return fragment;
  const firstRunEnd = fragment.indexOf("</w:r>");
  if (firstRunEnd === -1) return fragment;
  const insertAt = firstRunEnd + "</w:r>".length;
  return fragment.slice(0, insertAt) + "<w:r><w:tab/></w:r>" + fragment.slice(insertAt);
}

function fillExpClesSection(xml: string, experiences: DcConsultant["experiences"]): string {
  const anchor = "[Depuis X mois]";
  const rows = extractTags(xml, "w:tr");
  const row = rows.find((r) => r.xml.includes(anchor));
  if (!row) return xml; // gabarit modifié / section absente : on ne casse rien

  const cells = extractTags(row.xml, "w:tc");
  if (cells.length === 0) return xml;
  // Le gabarit ne contient qu'un texte « [2025] » (année), « [Depuis X mois] »
  // (durée), « [Intitulé du poste] » et « [Entreprise cliente] » — 4 nœuds
  // <w:t>, sans caractère de tabulation entre les deux premiers (voir
  // ensureTabRun) : la valeur doit correspondre exactement à cet ordre, faute
  // de quoi chaque valeur atterrit dans le mauvais texte et les placeholders
  // suivants restent affichés tels quels entre crochets.
  const cellTemplate = ensureTabRun(cells[0].xml);
  const { total: totalWidth, first: originalCellWidth } = readTblGridWidths(xml, row.start);

  const items = experiences.slice(0, 12); // garde-fou raisonnable, pas de vraie limite métier

  if (items.length === 0) {
    // Une <w:tr> sans aucune cellule est invalide (contrairement à un
    // <w:tbl> sans ligne) et corrompt visuellement tout le document une
    // fois ouvert dans Word (jusqu'au pied de page) — on retire la ligne
    // entière plutôt que de la vider.
    return xml.slice(0, row.start) + xml.slice(row.end);
  }

  const width = totalWidth / items.length;

  const newCells = items
    .map((exp) => {
      const values = [
        exp.dateDebut ? String(exp.dateDebut.getFullYear()) : "",
        formatDuree(exp.dateDebut, exp.dateFin),
        exp.missionTitre,
        exp.entreprise,
      ];
      const filled = fillSequentialText(cellTemplate, values);
      return setCellWidth(rescaleTabStop(filled, originalCellWidth, width), width);
    })
    .join("");

  const newRowXml = row.xml.slice(0, cells[0].start) + newCells + row.xml.slice(cells[cells.length - 1].end);
  const xmlWithRow = xml.slice(0, row.start) + newRowXml + xml.slice(row.end);
  return rewriteTblGridBefore(xmlWithRow, row.start, items.length, width);
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
  const { total: totalWidth } = readTblGridWidths(xml, row.start);

  const items = langues.slice(0, 12);
  if (items.length === 0) {
    // Même raison que pour les expériences clés : une <w:tr> sans cellule
    // est invalide et corrompt le rendu du document dans Word.
    return xml.slice(0, row.start) + xml.slice(row.end);
  }
  const width = totalWidth / items.length;

  const newCells = items
    .map((l) => {
      const values = [l.langue.label, null, niveauText(l.niveau), l.detail ?? ""];
      return setCellWidth(fillSequentialText(cellTemplate, values), width);
    })
    .join("");

  const newRowXml = row.xml.slice(0, cells[0].start) + newCells + row.xml.slice(cells[cells.length - 1].end);
  const xmlWithRow = xml.slice(0, row.start) + newRowXml + xml.slice(row.end);
  return rewriteTblGridBefore(xmlWithRow, row.start, items.length, width);
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
    // neutralisée ci-dessus) : le nombre et l'ordre des <w:t> restants
    // correspondent EXACTEMENT à ceux du gabarit actuel — entreprise / « — »
    // (séparateur statique) / dateRange / durée / « Secteur : » (libellé
    // statique) / secteur / « Mission : » (libellé statique) / mission /
    // « Contexte & objectif : » (libellé statique) / contexte / « Réalisations »
    // (libellé statique) / « Environnement technique : » (libellé statique) /
    // environnement — chaque libellé statique doit rester un `null` à sa
    // place exacte, sinon la valeur suivante écrase le libellé au lieu du
    // placeholder, qui reste alors affiché tel quel entre crochets.
    block = fillSequentialText(block, [
      exp.entreprise,
      null,
      `${formatMoisAnnee(exp.dateDebut)} à ${formatMoisAnnee(exp.dateFin)}`,
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

// --- Identité anonymisée (trigramme) et nom de fichier interne ------------

function stripDiacritics(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/** Le DC ne porte jamais le nom/prénom en clair (il peut être envoyé tel
 * quel à un client) : à la place, un trigramme — les deux premières lettres
 * du nom + la première du prénom (ex. FLEHO Gabriel → FLG). */
function computeTrigram(nom: string, prenom: string): string {
  const nomLetters = stripDiacritics(nom).replace(/[^a-zA-Z]/g, "");
  const prenomLetters = stripDiacritics(prenom).replace(/[^a-zA-Z]/g, "");
  return `${nomLetters.slice(0, 2).toUpperCase()}${prenomLetters.slice(0, 1).toUpperCase()}`;
}

/** Nom de fichier interne (jamais envoyé au client tel quel) : nom en
 * MAJUSCULES, prénom avec seulement l'initiale en majuscule — ex. « FLEHO
 * Gabriel DC.docx ». Diacritiques neutralisées pour rester un nom de
 * fichier sûr partout (en-têtes HTTP compris). */
export function formatDcFilename(nom: string, prenom: string): string {
  const nomPart = stripDiacritics(nom).trim().toUpperCase();
  const prenomTrimmed = stripDiacritics(prenom).trim();
  const prenomPart = prenomTrimmed
    ? prenomTrimmed.charAt(0).toUpperCase() + prenomTrimmed.slice(1).toLowerCase()
    : "";
  return `${[nomPart, prenomPart, "DC"].filter(Boolean).join(" ")}.docx`;
}

// --- Header, statut, profil (placeholders simples, occurrence unique) ------

function fillSimplePlaceholders(xml: string, c: DcConsultant): string {
  const anneesLabel = c.anneesExperience != null ? `${c.anneesExperience} ans d'expérience` : "";
  const compClesLabels = c.competences.filter((x) => x.estCle).map((x) => x.competence.label);
  const mobiliteLabel = [c.typesMobilite[0]?.typeMobilite.label, c.villeRattachement]
    .filter(Boolean)
    .join(" / ");

  const replacements: [string, string][] = [
    ["[Intitulé du poste / spécialité]", c.intitulePoste ?? ""],
    ["[Prénom NOM]", computeTrigram(c.nom, c.prenom)],
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

/** Le nom/prénom du candidat n'apparaît jamais dans le document généré
 * (seul un trigramme, voir computeTrigram) — un DC est prêt à être envoyé
 * tel quel à un client dès sa génération, qu'il soit téléchargé en interne
 * ou depuis la bibliothèque client. */
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
