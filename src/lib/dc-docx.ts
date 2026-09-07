import { readFile } from "node:fs/promises";
import path from "node:path";
import JSZip from "jszip";
import type { Prisma } from "@prisma/client";
import { NIVEAU_LABELS } from "@/lib/constants";
import { formatDuree, formatMoisAnnee } from "@/lib/experience-format";

// ---------------------------------------------------------------------------
// Génère le DC en remplissant DIRECTEMENT le fichier Word officiel HYPERION
// (src/lib/templates/hyperion-dc-template.docx), sans le reconstruire :
// on ne touche qu'au texte des placeholders repérés dans word/document.xml,
// tout le reste (logo, encadrés, couleurs, styles, pied de page) reste
// strictement identique au fichier fourni par HYPERION Group.
//
// Chaque placeholder du gabarit est isolé dans son propre <w:t> — on peut
// donc les remplacer un par un, dans l'ordre où ils apparaissent dans le
// document, sans risquer de casser la structure XML. Le tableau VALUE_MAP
// ci-dessous fait correspondre chaque position (0 à 157) à un champ de
// données ; `null` signifie « ne pas toucher » (libellés fixes du gabarit).
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

function buildDetailedExperienceBlock(
  exp: DcConsultant["experiences"][number] | undefined
): [string, string, string, string, string, string, string, string, string, string] {
  if (!exp) {
    return ["", "", "", "", "", "", "", "", "", ""];
  }
  const realisations = (exp.realisations ?? "").split("\n").filter(Boolean);
  return [
    exp.entreprise,
    `${formatMoisAnnee(exp.dateDebut)} à ${formatMoisAnnee(exp.dateFin)}`,
    formatDuree(exp.dateDebut, exp.dateFin),
    exp.secteurActivite ?? "",
    exp.missionTitre,
    exp.contexteObjectif ?? "",
    realisations[0] ?? "",
    realisations[1] ?? "",
    realisations[2] ?? "",
    exp.environnementTechnique ?? "",
  ];
}

function buildValues(c: DcConsultant): (string | null)[] {
  const anneesLabel =
    c.anneesExperienceMin != null
      ? c.anneesExperienceMax != null && c.anneesExperienceMax !== c.anneesExperienceMin
        ? `${c.anneesExperienceMin}–${c.anneesExperienceMax} ans d'expérience`
        : `${c.anneesExperienceMin}+ ans d'expérience`
      : "";

  const compClesLabels = c.competences.filter((x) => x.estCle).map((x) => x.competence.label);
  const mobiliteLabel = [
    c.typesMobilite[0]?.typeMobilite.label,
    c.villeRattachementZoneLarge,
  ]
    .filter(Boolean)
    .join(" / ");

  const catByType = new Map(c.competenceCategories.map((cat) => [cat.categorie, cat]));
  const cat = (type: string) => catByType.get(type);

  const langue = (i: number) => c.langues[i];

  const formation = (i: number) => c.formations[i];

  const exp = (i: number) => c.experiences[i];
  const expClesCard = (
    i: number
  ): [string, string, string, string] => {
    const e = exp(i);
    if (!e) return ["", "", "", ""];
    return [
      e.dateDebut ? String(e.dateDebut.getFullYear()) : "",
      formatDuree(e.dateDebut, e.dateFin),
      e.missionTitre,
      e.entreprise,
    ];
  };

  const d1 = buildDetailedExperienceBlock(exp(0));
  const d2 = buildDetailedExperienceBlock(exp(1));
  const d3 = buildDetailedExperienceBlock(exp(2));
  const d4 = buildDetailedExperienceBlock(exp(3));
  const c1 = expClesCard(0);
  const c2 = expClesCard(1);
  const c3 = expClesCard(2);

  // Index → valeur. `null` = libellé fixe du gabarit, ne pas toucher.
  return [
    /* 0 */ null, // "DOSSIER DE COMPÉTENCES"
    /* 1 */ c.intitulePoste ?? "",
    /* 2 */ `${c.prenom} ${c.nom}`,
    /* 3 */ null, // "   ·   "
    /* 4 */ anneesLabel,
    /* 5 */ null,
    /* 6 */ c.disponibilite ? DISPONIBILITE_FULL[c.disponibilite] ?? "" : "",
    /* 7 */ compClesLabels[0] ?? "",
    /* 8 */ compClesLabels[1] ?? "",
    /* 9 */ compClesLabels[2] ?? "",
    /* 10 */ mobiliteLabel,
    /* 11 */ null,
    /* 12 */ null, // "PROFIL"
    /* 13 */ null,
    /* 14 */ null, // "NIVEAU  "
    /* 15 */ c.seniority?.label ?? "",
    /* 16 */ c.resumeContexte ?? "",
    /* 17 */ null, // "01  —  "
    /* 18 */ null, // "Expériences clés"
    /* 19 */ c1[0],
    /* 20 */ null,
    /* 21 */ c1[1],
    /* 22 */ c1[2],
    /* 23 */ c1[3],
    /* 24 */ c2[0],
    /* 25 */ null,
    /* 26 */ c2[1],
    /* 27 */ c2[2],
    /* 28 */ c2[3],
    /* 29 */ c3[0],
    /* 30 */ null,
    /* 31 */ c3[1],
    /* 32 */ c3[2],
    /* 33 */ c3[3],
    /* 34 */ null, // "02  —  "
    /* 35 */ null, // "Compétences"
    /* 36 */ null, // "Domaines"
    /* 37 */ cat("DOMAINES")?.contenu ?? "",
    /* 38 */ niveauText(cat("DOMAINES")?.niveau),
    /* 39 */ null, // "Logiciels & outils"
    /* 40 */ cat("LOGICIELS_OUTILS")?.contenu ?? "",
    /* 41 */ niveauText(cat("LOGICIELS_OUTILS")?.niveau),
    /* 42 */ null, // "Méthodes & normes"
    /* 43 */ cat("METHODES_NORMES")?.contenu ?? "",
    /* 44 */ niveauText(cat("METHODES_NORMES")?.niveau),
    /* 45 */ null, // "Secteurs"
    /* 46 */ cat("SECTEURS")?.contenu ?? "",
    /* 47 */ niveauText(cat("SECTEURS")?.niveau),
    /* 48 */ null, // "Management"
    /* 49 */ cat("MANAGEMENT")?.contenu ?? "",
    /* 50 */ niveauText(cat("MANAGEMENT")?.niveau),
    /* 51 */ null, // "03  —  "
    /* 52 */ null, // "Formations & certifications"
    /* 53 */ formation(0)?.annee ?? "",
    /* 54 */ formation(0)?.intitule ?? "",
    /* 55 */ null,
    /* 56 */ formation(0)?.etablissement ?? "",
    /* 57 */ formation(1)?.annee ?? "",
    /* 58 */ formation(1)?.intitule ?? "",
    /* 59 */ null,
    /* 60 */ formation(1)?.etablissement ?? "",
    /* 61 */ formation(2)?.annee ?? "",
    /* 62 */ formation(2)?.intitule ?? "",
    /* 63 */ null,
    /* 64 */ formation(2)?.etablissement ?? "",
    /* 65 */ null, // "04  —  "
    /* 66 */ null, // "Langues"
    /* 67 */ langue(0)?.langue.label ?? "",
    /* 68 */ null,
    /* 69 */ langue(0) ? niveauText(langue(0).niveau) : "",
    /* 70 */ langue(0)?.detail ?? "",
    /* 71 */ langue(1)?.langue.label ?? "",
    /* 72 */ null,
    /* 73 */ langue(1) ? niveauText(langue(1).niveau) : "",
    /* 74 */ langue(1)?.detail ?? "",
    /* 75 */ langue(2)?.langue.label ?? "",
    /* 76 */ null,
    /* 77 */ langue(2) ? niveauText(langue(2).niveau) : "",
    /* 78 */ langue(2)?.detail ?? "",
    /* 79 */ null, // "05  —  "
    /* 80 */ null, // "Expériences détaillées"
    /* 81 */ "", // note d'aide interne du gabarit, retirée du document final
    /* 82 */ d1[0], /* 83 */ null, /* 84 */ d1[1], /* 85 */ null, /* 86 */ d1[2],
    /* 87 */ null, /* 88 */ d1[3],
    /* 89 */ null, /* 90 */ d1[4],
    /* 91 */ null, /* 92 */ d1[5],
    /* 93 */ null, // "Réalisations"
    /* 94 */ "", // ⟦B⟧ marqueur interne, retiré
    /* 95 */ d1[6], /* 96 */ d1[7], /* 97 */ d1[8],
    /* 98 */ "", // ⟦/B⟧ marqueur interne, retiré
    /* 99 */ null, /* 100 */ d1[9],

    /* 101 */ d2[0], /* 102 */ null, /* 103 */ d2[1], /* 104 */ null, /* 105 */ d2[2],
    /* 106 */ null, /* 107 */ d2[3],
    /* 108 */ null, /* 109 */ d2[4],
    /* 110 */ null, /* 111 */ d2[5],
    /* 112 */ null,
    /* 113 */ "",
    /* 114 */ d2[6], /* 115 */ d2[7], /* 116 */ d2[8],
    /* 117 */ "",
    /* 118 */ null, /* 119 */ d2[9],

    /* 120 */ d3[0], /* 121 */ null, /* 122 */ d3[1], /* 123 */ null, /* 124 */ d3[2],
    /* 125 */ null, /* 126 */ d3[3],
    /* 127 */ null, /* 128 */ d3[4],
    /* 129 */ null, /* 130 */ d3[5],
    /* 131 */ null,
    /* 132 */ "",
    /* 133 */ d3[6], /* 134 */ d3[7], /* 135 */ d3[8],
    /* 136 */ "",
    /* 137 */ null, /* 138 */ d3[9],

    /* 139 */ d4[0], /* 140 */ null, /* 141 */ d4[1], /* 142 */ null, /* 143 */ d4[2],
    /* 144 */ null, /* 145 */ d4[3],
    /* 146 */ null, /* 147 */ d4[4],
    /* 148 */ null, /* 149 */ d4[5],
    /* 150 */ null,
    /* 151 */ "",
    /* 152 */ d4[6], /* 153 */ d4[7], /* 154 */ d4[8],
    /* 155 */ "",
    /* 156 */ null, /* 157 */ d4[9],
  ];
}

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\r?\n/g, " ");
}

function fillDocumentXml(xml: string, values: (string | null)[]): string {
  let i = 0;
  return xml.replace(
    /<w:t\b[^>]*\/>|<w:t\b[^>]*>[\s\S]*?<\/w:t>/g,
    (fullMatch) => {
      const value = values[i];
      i++;
      if (value === null || value === undefined) return fullMatch;

      const isSelfClosing = /\/>$/.test(fullMatch);
      const openTagEnd = isSelfClosing
        ? fullMatch.length - 2 // avant "/>"
        : fullMatch.indexOf(">") + 1;
      const openTag = isSelfClosing
        ? fullMatch.slice(0, openTagEnd) + ">"
        : fullMatch.slice(0, openTagEnd);
      return `${openTag}${xmlEscape(value)}</w:t>`;
    }
  );
}

export async function buildDcDocx(c: DcConsultant): Promise<Buffer> {
  const templateBuffer = await readFile(TEMPLATE_PATH);
  const zip = await JSZip.loadAsync(templateBuffer);

  const documentXmlFile = zip.file("word/document.xml");
  if (!documentXmlFile) {
    throw new Error("Gabarit HYPERION invalide : word/document.xml introuvable.");
  }
  const originalXml = await documentXmlFile.async("string");
  const values = buildValues(c);
  const filledXml = fillDocumentXml(originalXml, values);
  zip.file("word/document.xml", filledXml);

  const result = await zip.generateAsync({ type: "nodebuffer" });
  return result;
}
