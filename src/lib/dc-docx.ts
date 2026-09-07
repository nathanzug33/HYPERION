import {
  BorderStyle,
  Document,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import type { Prisma } from "@prisma/client";
import {
  COMPETENCE_CATEGORIE_LABELS,
  DISPONIBILITE_LABELS,
  NIVEAU_LABELS,
  TYPE_CONTRAT_LABELS,
} from "@/lib/constants";
import { formatDuree, formatMoisAnnee } from "@/lib/experience-format";

// Palette extraite du gabarit HYPERION officiel (sans logo).
const COLOR = {
  ink: "222D3C",
  body: "26303F",
  gray: "5A6678",
  blue: "6387AD",
  blueLight: "9DC0EC",
  blueBg: "EAF1F9",
  blueBgSoft: "F4F7FB",
  green: "1F5F4A",
  white: "FFFFFF",
};

const PAGE_WIDTH_DXA = 9026; // A4, marges par défaut

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

function noBorders() {
  const none = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
  return { top: none, bottom: none, left: none, right: none };
}

function cell(
  children: Paragraph[],
  opts: { width: number; fill?: string; margins?: number } = { width: 1000 }
) {
  return new TableCell({
    width: { size: opts.width, type: WidthType.DXA },
    shading: opts.fill
      ? { type: ShadingType.CLEAR, color: "auto", fill: opts.fill }
      : undefined,
    borders: noBorders(),
    margins: {
      top: opts.margins ?? 120,
      bottom: opts.margins ?? 120,
      left: opts.margins ?? 160,
      right: opts.margins ?? 160,
    },
    children,
  });
}

function p(
  text: string,
  opts: {
    bold?: boolean;
    size?: number;
    color?: string;
    spacingAfter?: number;
    italics?: boolean;
    allCaps?: boolean;
  } = {}
) {
  return new Paragraph({
    spacing: { after: opts.spacingAfter ?? 0 },
    children: [
      new TextRun({
        text,
        bold: opts.bold,
        italics: opts.italics,
        size: opts.size ?? 20,
        color: opts.color ?? COLOR.body,
        allCaps: opts.allCaps,
      }),
    ],
  });
}

function sectionTitle(numero: string, titre: string) {
  return new Paragraph({
    spacing: { before: 320, after: 140 },
    children: [
      new TextRun({ text: `${numero}  —  `, bold: true, color: COLOR.blue, size: 20 }),
      new TextRun({
        text: titre.toUpperCase(),
        bold: true,
        color: COLOR.ink,
        size: 20,
      }),
    ],
  });
}

function niveauDots(niveau: number): string {
  const n = Math.max(0, Math.min(5, niveau));
  return "●".repeat(n) + "○".repeat(5 - n);
}

export async function buildDcDocx(c: DcConsultant): Promise<Buffer> {
  const anneesLabel =
    c.anneesExperienceMin != null
      ? c.anneesExperienceMax != null && c.anneesExperienceMax !== c.anneesExperienceMin
        ? `${c.anneesExperienceMin}–${c.anneesExperienceMax} ans d'expérience`
        : `${c.anneesExperienceMin}+ ans d'expérience`
      : "";

  const children: (Paragraph | Table)[] = [];

  // --- En-tête -------------------------------------------------------------
  children.push(
    new Table({
      width: { size: PAGE_WIDTH_DXA, type: WidthType.DXA },
      columnWidths: [PAGE_WIDTH_DXA],
      rows: [
        new TableRow({
          children: [
            cell(
              [
                p("DOSSIER DE COMPÉTENCES", { size: 16, color: COLOR.blue, bold: true }),
                p(c.intitulePoste || "Poste non renseigné", {
                  bold: true,
                  size: 32,
                  color: COLOR.ink,
                  spacingAfter: 40,
                }),
                p(
                  `${c.prenom} ${c.nom}   ·   ${anneesLabel}`,
                  { size: 20, color: COLOR.body }
                ),
              ],
              { width: PAGE_WIDTH_DXA, fill: COLOR.blueBg, margins: 200 }
            ),
          ],
        }),
      ],
    })
  );

  // --- Bandeau statut --------------------------------------------------------
  const compClesLabels = c.competences
    .filter((x) => x.estCle)
    .map((x) => x.competence.label);
  const badgeCells: TableCell[] = [];
  const dispoLabel = c.disponibilite
    ? DISPONIBILITE_LABELS[c.disponibilite as keyof typeof DISPONIBILITE_LABELS] ?? c.disponibilite
    : "Disponibilité non renseignée";
  badgeCells.push(
    cell([p(dispoLabel, { color: COLOR.white, bold: true, size: 18 })], {
      width: 2200,
      fill: COLOR.green,
    })
  );
  const compSlots = compClesLabels.length > 0 ? compClesLabels : ["—"];
  const remaining = PAGE_WIDTH_DXA - 2200;
  const each = Math.floor(remaining / (compSlots.length + 1));
  for (const label of compSlots) {
    badgeCells.push(
      cell([p(label, { color: COLOR.body, size: 18 })], { width: each, fill: COLOR.blueBgSoft })
    );
  }
  const zoneLabel = c.villeRattachementZoneLarge || "Mobilité non renseignée";
  badgeCells.push(
    cell([p(zoneLabel, { color: COLOR.body, size: 18 })], { width: each, fill: COLOR.blueBgSoft })
  );

  children.push(
    new Table({
      width: { size: PAGE_WIDTH_DXA, type: WidthType.DXA },
      columnWidths: badgeCells.map((_, i) => (i === 0 ? 2200 : each)),
      rows: [new TableRow({ children: badgeCells })],
    })
  );

  children.push(new Paragraph({ spacing: { after: 200 }, children: [] }));

  // --- Profil ----------------------------------------------------------------
  children.push(
    new Table({
      width: { size: PAGE_WIDTH_DXA, type: WidthType.DXA },
      columnWidths: [2200, PAGE_WIDTH_DXA - 2200],
      rows: [
        new TableRow({
          children: [
            cell(
              [
                p("PROFIL", { size: 16, color: COLOR.gray, bold: true, spacingAfter: 60 }),
                p(c.seniority?.label ?? "—", { bold: true, size: 22, color: COLOR.ink }),
              ],
              { width: 2200 }
            ),
            cell(
              [
                p(c.resumeContexte || "Résumé non renseigné.", {
                  size: 20,
                  color: COLOR.body,
                }),
              ],
              { width: PAGE_WIDTH_DXA - 2200 }
            ),
          ],
        }),
      ],
    })
  );

  // --- 01 — Expériences clés --------------------------------------------------
  if (c.experiences.length > 0) {
    children.push(sectionTitle("01", "Expériences clés"));
    const top = c.experiences.slice(0, 3);
    const w = Math.floor(PAGE_WIDTH_DXA / top.length);
    children.push(
      new Table({
        width: { size: PAGE_WIDTH_DXA, type: WidthType.DXA },
        columnWidths: top.map(() => w),
        rows: [
          new TableRow({
            children: top.map((exp) =>
              cell(
                [
                  p(formatMoisAnnee(exp.dateDebut), { color: COLOR.blue, bold: true, size: 16 }),
                  p(exp.missionTitre, { bold: true, color: COLOR.ink, size: 18 }),
                  p(exp.entreprise, { color: COLOR.gray, size: 16 }),
                ],
                { width: w, fill: COLOR.blueBgSoft }
              )
            ),
          }),
        ],
      })
    );
  }

  // --- 02 — Compétences -------------------------------------------------------
  if (c.competenceCategories.length > 0) {
    children.push(sectionTitle("02", "Compétences"));
    children.push(
      new Table({
        width: { size: PAGE_WIDTH_DXA, type: WidthType.DXA },
        columnWidths: [2200, PAGE_WIDTH_DXA - 2200 - 1800, 1800],
        rows: c.competenceCategories.map(
          (cat) =>
            new TableRow({
              children: [
                cell([p(COMPETENCE_CATEGORIE_LABELS[cat.categorie as keyof typeof COMPETENCE_CATEGORIE_LABELS] ?? cat.categorie, { bold: true, color: COLOR.ink, size: 18 })], { width: 2200 }),
                cell([p(cat.contenu, { color: COLOR.body, size: 18 })], {
                  width: PAGE_WIDTH_DXA - 2200 - 1800,
                }),
                cell(
                  [
                    p(`${niveauDots(cat.niveau)}  ${NIVEAU_LABELS[cat.niveau] ?? ""}`, {
                      color: COLOR.blue,
                      size: 18,
                    }),
                  ],
                  { width: 1800 }
                ),
              ],
            })
        ),
      })
    );
  }

  // --- 03 — Formations & certifications ---------------------------------------
  if (c.formations.length > 0) {
    children.push(sectionTitle("03", "Formations & certifications"));
    children.push(
      new Table({
        width: { size: PAGE_WIDTH_DXA, type: WidthType.DXA },
        columnWidths: [1200, PAGE_WIDTH_DXA - 1200],
        rows: c.formations.map(
          (f) =>
            new TableRow({
              children: [
                cell([p(f.annee, { color: COLOR.gray, size: 18 })], { width: 1200 }),
                cell(
                  [
                    p(
                      `${f.intitule}${f.etablissement ? "  —  " + f.etablissement : ""}`,
                      { color: COLOR.body, size: 18 }
                    ),
                  ],
                  { width: PAGE_WIDTH_DXA - 1200 }
                ),
              ],
            })
        ),
      })
    );
  }

  // --- 04 — Langues ------------------------------------------------------------
  if (c.langues.length > 0) {
    children.push(sectionTitle("04", "Langues"));
    const w = Math.floor(PAGE_WIDTH_DXA / Math.min(c.langues.length, 4) || PAGE_WIDTH_DXA);
    children.push(
      new Table({
        width: { size: PAGE_WIDTH_DXA, type: WidthType.DXA },
        columnWidths: c.langues.map(() => w),
        rows: [
          new TableRow({
            children: c.langues.map((l) =>
              cell(
                [
                  p(l.langue.label, { bold: true, color: COLOR.ink, size: 18 }),
                  p(`${niveauDots(l.niveau)}  ${l.detail || NIVEAU_LABELS[l.niveau] || ""}`, {
                    color: COLOR.blue,
                    size: 16,
                  }),
                ],
                { width: w }
              )
            ),
          }),
        ],
      })
    );
  }

  // --- 05 — Expériences détaillées ---------------------------------------------
  if (c.experiences.length > 0) {
    children.push(sectionTitle("05", "Expériences détaillées"));
    for (const exp of c.experiences) {
      children.push(
        new Paragraph({
          spacing: { before: 200, after: 20 },
          children: [
            new TextRun({
              text: `${exp.entreprise}  —  ${formatMoisAnnee(exp.dateDebut)} à ${formatMoisAnnee(exp.dateFin)}`,
              bold: true,
              color: COLOR.ink,
              size: 20,
            }),
            new TextRun({
              text: `   (${formatDuree(exp.dateDebut, exp.dateFin)})`,
              color: COLOR.blueLight,
              size: 18,
            }),
          ],
        })
      );
      if (exp.secteurActivite) children.push(p(`Secteur : ${exp.secteurActivite}`, { size: 18 }));
      children.push(p(`Mission : ${exp.missionTitre}`, { size: 18 }));
      if (exp.contexteObjectif)
        children.push(p(`Contexte & objectif : ${exp.contexteObjectif}`, { size: 18 }));
      if (exp.realisations) {
        children.push(p("Réalisations", { bold: true, color: COLOR.blue, size: 18, spacingAfter: 40 }));
        for (const line of exp.realisations.split("\n").filter(Boolean)) {
          children.push(
            new Paragraph({
              bullet: { level: 0 },
              children: [new TextRun({ text: line, size: 18, color: COLOR.body })],
            })
          );
        }
      }
      if (exp.environnementTechnique)
        children.push(
          p(`Environnement technique : ${exp.environnementTechnique}`, {
            size: 18,
            spacingAfter: 100,
          })
        );
    }
  }

  // --- Mobilité ------------------------------------------------------------
  const mobilites = c.typesMobilite.map((m) => m.typeMobilite.label);
  const zones = c.zonesGeographiques.map((z) => z.zoneGeographique.label);
  if (mobilites.length > 0 || zones.length > 0) {
    children.push(sectionTitle("06", "Mobilité"));
    children.push(p(mobilites.join(", "), { bold: true, color: COLOR.ink, size: 18 }));
    const details: string[] = [];
    if (zones.length > 0) details.push(`Zones : ${zones.join(", ")}`);
    if (c.villeRattachementZoneLarge) details.push(`Rattachement : ${c.villeRattachementZoneLarge}`);
    if (c.rayonKm) details.push(`Rayon accepté : jusqu'à ${c.rayonKm} km`);
    if (c.ouvertGrandDeplacement) details.push("Ouvert au grand déplacement");
    if (details.length > 0) children.push(p(details.join(" · "), { size: 18, color: COLOR.body }));
  }

  // --- Coordonnées internes (bas de page, usage BM uniquement) ---------------
  children.push(
    new Paragraph({
      spacing: { before: 400 },
      border: { top: { style: BorderStyle.SINGLE, size: 4, color: "D9E2EC" } },
      children: [
        new TextRun({
          text: `Référence interne : ${c.referenceAnonyme}   ·   Contact : ${c.email ?? "—"}${c.telephone ? " · " + c.telephone : ""}   ·   TJM : ${c.tjmMin ?? "?"}–${c.tjmMax ?? "?"} €${c.typeContrat ? "   ·   " + (TYPE_CONTRAT_LABELS[c.typeContrat as keyof typeof TYPE_CONTRAT_LABELS] ?? c.typeContrat) : ""}`,
          size: 14,
          color: COLOR.gray,
          italics: true,
        }),
      ],
    })
  );

  const doc = new Document({
    creator: "HYPERION Group",
    title: `DC — ${c.prenom} ${c.nom}`,
    styles: {
      default: {
        document: {
          run: { font: "Calibri", size: 20, color: COLOR.body },
        },
      },
    },
    sections: [
      {
        properties: {},
        children,
      },
    ],
  });

  return Packer.toBuffer(doc);
}
