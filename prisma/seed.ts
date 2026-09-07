import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function upsertReferential<T extends { label: string }>(
  model: {
    upsert: (args: {
      where: { label: string };
      update: Record<string, unknown>;
      create: { label: string } & Record<string, unknown>;
    }) => Promise<T>;
  },
  items: string[],
  withOrdre = true
): Promise<T[]> {
  const created: T[] = [];
  for (let i = 0; i < items.length; i++) {
    const label = items[i];
    const ordreFields = withOrdre ? { ordre: i } : {};
    created.push(
      await model.upsert({
        where: { label },
        update: ordreFields,
        create: { label, ...ordreFields },
      })
    );
  }
  return created;
}

async function main() {
  console.log("Seed — référentiels…");

  const secteurs = await upsertReferential(prisma.secteur, [
    "Industrie",
    "Énergie",
    "Automobile",
    "Aéronautique",
    "IT / Logiciel",
    "Banque / Assurance",
    "Santé",
    "Retail / e-commerce",
  ]);

  const expertises = await upsertReferential(prisma.expertise, [
    "DevOps / Cloud",
    "Data / IA",
    "Automatisme / Robotique",
    "Développement logiciel",
    "Cybersécurité",
    "Gestion de projet / PMO",
    "Qualité / Test",
    "Réseaux / Infrastructure",
  ]);

  const seniorites: Awaited<ReturnType<typeof prisma.seniorite.upsert>>[] = [];
  const seniorityDefs: Array<{
    label: string;
    anneesMin: number;
    anneesMax: number | null;
  }> = [
    { label: "Junior", anneesMin: 0, anneesMax: 2 },
    { label: "Confirmé", anneesMin: 3, anneesMax: 6 },
    { label: "Senior", anneesMin: 7, anneesMax: 10 },
    { label: "Expert", anneesMin: 11, anneesMax: null },
  ];
  for (let i = 0; i < seniorityDefs.length; i++) {
    const s = seniorityDefs[i];
    seniorites.push(
      await prisma.seniorite.upsert({
        where: { label: s.label },
        update: { ordre: i, anneesMin: s.anneesMin, anneesMax: s.anneesMax },
        create: {
          label: s.label,
          ordre: i,
          anneesMin: s.anneesMin,
          anneesMax: s.anneesMax,
        },
      })
    );
  }

  const typesMobilite = await upsertReferential(prisma.typeMobilite, [
    "Sur site",
    "Hybride",
    "Full remote",
    "Mobilité nationale",
    "Mobilité régionale",
  ]);

  const zones = await upsertReferential(prisma.zoneGeographique, [
    "Île-de-France",
    "Auvergne-Rhône-Alpes",
    "Occitanie",
    "Nouvelle-Aquitaine",
    "Hauts-de-France",
    "Grand Est",
    "Provence-Alpes-Côte d'Azur",
    "Bretagne",
    "Pays de la Loire",
  ]);

  const competences = await upsertReferential(
    prisma.competence,
    [
    "AWS",
    "Azure",
    "Kubernetes",
    "Docker",
    "Terraform",
    "Python",
    "Java",
    "TypeScript",
    "React",
    "Siemens TIA Portal",
    "SCADA",
    "SAP",
    "ISTQB",
    "PMP",
    "Power BI",
    "SQL",
    ],
    false
  );

  const langues = await upsertReferential(
    prisma.langue,
    [
    "Français",
    "Anglais",
    "Allemand",
    "Espagnol",
    ],
    false
  );

  console.log("Seed — comptes…");

  const passwordHash = await bcrypt.hash("ChangeMe!2024", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@societe-conseil.fr" },
    update: {},
    create: {
      email: "admin@societe-conseil.fr",
      name: "Admin Principal",
      role: "ADMIN",
      passwordHash,
    },
  });

  const bm1 = await prisma.user.upsert({
    where: { email: "sophie.martin@societe-conseil.fr" },
    update: {},
    create: {
      email: "sophie.martin@societe-conseil.fr",
      name: "Sophie Martin",
      role: "BM",
      passwordHash,
    },
  });

  const bm2 = await prisma.user.upsert({
    where: { email: "karim.benali@societe-conseil.fr" },
    update: {},
    create: {
      email: "karim.benali@societe-conseil.fr",
      name: "Karim Benali",
      role: "BM",
      passwordHash,
    },
  });

  const clientOrg = await prisma.clientOrganization.upsert({
    where: { id: "demo-client-org" },
    update: {},
    create: {
      id: "demo-client-org",
      name: "Client Démo SA",
    },
  });

  const clientUser = await prisma.user.upsert({
    where: { email: "contact@client-demo.fr" },
    update: {},
    create: {
      email: "contact@client-demo.fr",
      name: "Julie Client",
      role: "CLIENT",
      passwordHash,
      clientOrganizationId: clientOrg.id,
    },
  });

  console.log("Seed — dossiers de compétences…");

  const findSec = (label: string) => secteurs.find((s) => s.label === label)!;
  const findExp = (label: string) =>
    expertises.find((s) => s.label === label)!;
  const findSen = (label: string) =>
    seniorites.find((s) => s.label === label)!;
  const findMob = (label: string) =>
    typesMobilite.find((s) => s.label === label)!;
  const findZone = (label: string) => zones.find((s) => s.label === label)!;
  const findComp = (label: string) =>
    competences.find((s) => s.label === label)!;
  const findLangue = (label: string) => langues.find((s) => s.label === label)!;

  type Sample = {
    ref: string;
    nom: string;
    prenom: string;
    poste: string;
    seniority: string;
    anneesMin: number;
    anneesMax: number;
    secteurs: string[];
    expertises: string[];
    competences: string[];
    mobilite: string[];
    zones: string[];
    disponibilite: string;
    resume: string;
    bm: string;
    langues: string[];
  };

  const samples: Sample[] = [
    {
      ref: "IND-017",
      nom: "Durand",
      prenom: "Marc",
      poste: "Ingénieur automaticien",
      seniority: "Senior",
      anneesMin: 8,
      anneesMax: 10,
      secteurs: ["Industrie", "Automobile"],
      expertises: ["Automatisme / Robotique"],
      competences: ["Siemens TIA Portal", "SCADA"],
      mobilite: ["Mobilité nationale"],
      zones: ["Auvergne-Rhône-Alpes", "Grand Est"],
      disponibilite: "SOUS_1_MOIS",
      resume:
        "Pilotage de la mise en service de lignes de production automatisées pour un grand groupe automobile ; programmation d'automates et supervision SCADA.",
      bm: "sophie.martin@societe-conseil.fr",
      langues: ["Français", "Anglais"],
    },
    {
      ref: "IT-042",
      nom: "Lefevre",
      prenom: "Claire",
      poste: "Data engineer",
      seniority: "Confirmé",
      anneesMin: 4,
      anneesMax: 6,
      secteurs: ["IT / Logiciel", "Banque / Assurance"],
      expertises: ["Data / IA"],
      competences: ["Python", "SQL", "AWS"],
      mobilite: ["Hybride", "Full remote"],
      zones: ["Île-de-France"],
      disponibilite: "IMMEDIATE",
      resume:
        "Conception de pipelines de données pour un acteur bancaire : ingestion, transformation et mise à disposition de données pour des équipes data science.",
      bm: "karim.benali@societe-conseil.fr",
      langues: ["Français", "Anglais"],
    },
    {
      ref: "CLD-009",
      nom: "Petit",
      prenom: "Alexandre",
      poste: "Ingénieur DevOps / Cloud",
      seniority: "Expert",
      anneesMin: 12,
      anneesMax: 15,
      secteurs: ["IT / Logiciel", "Retail / e-commerce"],
      expertises: ["DevOps / Cloud"],
      competences: ["Kubernetes", "Docker", "Terraform", "AWS", "Azure"],
      mobilite: ["Full remote"],
      zones: ["Île-de-France", "Bretagne"],
      disponibilite: "SOUS_2_MOIS",
      resume:
        "Refonte de l'infrastructure cloud d'une plateforme e-commerce à fort trafic : industrialisation CI/CD, conteneurisation, observabilité.",
      bm: "sophie.martin@societe-conseil.fr",
      langues: ["Français", "Anglais", "Espagnol"],
    },
    {
      ref: "QA-005",
      nom: "Rousseau",
      prenom: "Emma",
      poste: "Ingénieure qualité / test",
      seniority: "Junior",
      anneesMin: 1,
      anneesMax: 2,
      secteurs: ["IT / Logiciel", "Santé"],
      expertises: ["Qualité / Test"],
      competences: ["ISTQB", "SQL"],
      mobilite: ["Sur site", "Hybride"],
      zones: ["Occitanie"],
      disponibilite: "SUR_PREAVIS",
      resume:
        "Mise en place d'une stratégie de tests automatisés pour une application e-santé réglementée (traçabilité, exigences qualité strictes).",
      bm: "karim.benali@societe-conseil.fr",
      langues: ["Français", "Anglais"],
    },
    {
      ref: "CY-023",
      nom: "Moreau",
      prenom: "Thomas",
      poste: "Consultant cybersécurité",
      seniority: "Senior",
      anneesMin: 8,
      anneesMax: 9,
      secteurs: ["Banque / Assurance", "Énergie"],
      expertises: ["Cybersécurité"],
      competences: ["AWS", "Azure"],
      mobilite: ["Mobilité nationale", "Hybride"],
      zones: ["Île-de-France", "Provence-Alpes-Côte d'Azur"],
      disponibilite: "SOUS_1_MOIS",
      resume:
        "Audit et durcissement de la sécurité d'infrastructures critiques pour un opérateur d'énergie ; gestion de crise et sensibilisation des équipes.",
      bm: "sophie.martin@societe-conseil.fr",
      langues: ["Français", "Anglais", "Allemand"],
    },
  ];

  for (const s of samples) {
    const consultant = await prisma.consultant.upsert({
      where: { referenceAnonyme: s.ref },
      update: {},
      create: {
        referenceAnonyme: s.ref,
        nom: s.nom,
        prenom: s.prenom,
        email: `${s.prenom.toLowerCase()}.${s.nom.toLowerCase()}@example.invalid`,
        businessManagerId: (s.bm === bm1.email ? bm1 : bm2).id,
        dateRencontre: new Date(),
        statutCandidatInterne: "EN_COURS",
        consentementRgpd: true,
        consentementDate: new Date(),
        consentementPublication: true,
        dureeConservationMois: 24,
        intitulePoste: s.poste,
        seniorityId: findSen(s.seniority).id,
        anneesExperienceMin: s.anneesMin,
        anneesExperienceMax: s.anneesMax,
        resumeContexte: s.resume,
        disponibilite: s.disponibilite,
        disponibiliteConfirmeeLe: new Date(),
        typeContrat: "REGIE",
        villeRattachementZoneLarge: s.zones[0],
        statutPublication: "PUBLIEE",
        datePublication: new Date(),
        secteurs: {
          create: s.secteurs.map((label) => ({ secteurId: findSec(label).id })),
        },
        expertises: {
          create: s.expertises.map((label) => ({
            expertiseId: findExp(label).id,
          })),
        },
        competences: {
          create: s.competences.map((label) => ({
            competenceId: findComp(label).id,
          })),
        },
        typesMobilite: {
          create: s.mobilite.map((label) => ({
            typeMobiliteId: findMob(label).id,
          })),
        },
        zonesGeographiques: {
          create: s.zones.map((label) => ({
            zoneGeographiqueId: findZone(label).id,
          })),
        },
        langues: {
          create: s.langues.map((label) => ({
            langueId: findLangue(label).id,
          })),
        },
      },
    });
    console.log(`  ✓ ${consultant.referenceAnonyme} — ${consultant.intitulePoste}`);
  }

  console.log("\nComptes de démonstration (mot de passe : ChangeMe!2024) :");
  console.log(`  Admin  : ${admin.email}`);
  console.log(`  BM     : ${bm1.email}`);
  console.log(`  BM     : ${bm2.email}`);
  console.log(`  Client : ${clientUser.email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
