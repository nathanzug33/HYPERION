import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { findVille } from "../src/lib/villes-france";

const prisma = new PrismaClient();

type RefItem = string | { label: string; categorie?: string };

async function upsertReferential<T extends { label: string }>(
  model: {
    upsert: (args: {
      where: { label: string };
      update: Record<string, unknown>;
      create: { label: string } & Record<string, unknown>;
    }) => Promise<T>;
  },
  items: RefItem[],
  withOrdre = true
): Promise<T[]> {
  const created: T[] = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const label = typeof item === "string" ? item : item.label;
    const categorie = typeof item === "string" ? undefined : item.categorie;
    const extraFields = {
      ...(withOrdre ? { ordre: i } : {}),
      ...(categorie ? { categorie } : {}),
    };
    created.push(
      await model.upsert({
        where: { label },
        update: extraFields,
        create: { label, ...extraFields },
      })
    );
  }
  return created;
}

async function main() {
  console.log("Seed — référentiels…");

  const secteurs = await upsertReferential(prisma.secteur, [
    { label: "Industrie", categorie: "INDUSTRIE" },
    { label: "Énergie", categorie: "INDUSTRIE" },
    { label: "Automobile", categorie: "INDUSTRIE" },
    { label: "Aéronautique", categorie: "INDUSTRIE" },
    { label: "IT / Logiciel", categorie: "DIGITAL" },
    { label: "Banque / Assurance", categorie: "DIGITAL" },
    { label: "Santé", categorie: "DIGITAL" },
    { label: "Retail / e-commerce", categorie: "DIGITAL" },
  ]);

  // Sous-secteurs de la catégorie "Industrie" (§ Entreprise.industrieId) —
  // liste volontairement exhaustive, éditable ensuite depuis /admin/referentiels.
  await upsertReferential(prisma.industrie, [
    "Énergie",
    "Énergies renouvelables",
    "Nucléaire",
    "Pétrole & gaz",
    "Environnement",
    "Eau / traitement des eaux",
    "Recyclage / économie circulaire",
    "Agroalimentaire",
    "Agriculture / agroéquipement",
    "Pharmaceutique",
    "Dispositifs médicaux",
    "Biotechnologies",
    "Chimie",
    "Cosmétique",
    "Aéronautique, spatial, défense (ASD)",
    "Automobile",
    "Ferroviaire",
    "Naval / maritime",
    "Industrie lourde (sidérurgie, métallurgie)",
    "Mines / matières premières",
    "Bureau d'études / ingénierie",
    "BTP / construction",
    "Matériaux (verre, plastique, composites)",
    "Électronique / semi-conducteurs",
    "Équipements industriels / machines-outils",
    "Robotique / automatisation industrielle",
    "Textile",
    "Luxe",
    "Papier / carton / emballage",
    "Logistique industrielle",
    "Utilities (énergie, eau, déchets)",
  ]);

  const expertises = await upsertReferential(prisma.expertise, [
    { label: "DevOps / Cloud", categorie: "DIGITAL" },
    { label: "Data / IA", categorie: "DIGITAL" },
    { label: "Automatisme / Robotique", categorie: "INDUSTRIE" },
    { label: "Développement logiciel", categorie: "DIGITAL" },
    { label: "Cybersécurité", categorie: "DIGITAL" },
    { label: "Gestion de projet / PMO", categorie: "DIGITAL" },
    { label: "Qualité / Test", categorie: "DIGITAL" },
    { label: "Réseaux / Infrastructure", categorie: "DIGITAL" },
    { label: "Mécanique / Conception", categorie: "INDUSTRIE" },
    { label: "Électronique / Électrotechnique", categorie: "INDUSTRIE" },
    { label: "Méthodes / Qualité industrielle", categorie: "INDUSTRIE" },
    { label: "Génie des procédés", categorie: "INDUSTRIE" },
    { label: "Ingénierie systèmes", categorie: "INDUSTRIE" },
    { label: "HSE (Hygiène Sécurité Environnement)", categorie: "INDUSTRIE" },
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

  // Toutes les régions de France (13 régions métropolitaines + 5 DROM).
  const zones = await upsertReferential(prisma.zoneGeographique, [
    "Île-de-France",
    "Auvergne-Rhône-Alpes",
    "Bourgogne-Franche-Comté",
    "Bretagne",
    "Centre-Val de Loire",
    "Corse",
    "Grand Est",
    "Hauts-de-France",
    "Normandie",
    "Nouvelle-Aquitaine",
    "Occitanie",
    "Pays de la Loire",
    "Provence-Alpes-Côte d'Azur",
    "Guadeloupe",
    "Martinique",
    "Guyane",
    "La Réunion",
    "Mayotte",
  ]);

  const competences = await upsertReferential(
    prisma.competence,
    [
    { label: "AWS", categorie: "DIGITAL" },
    { label: "Azure", categorie: "DIGITAL" },
    { label: "Kubernetes", categorie: "DIGITAL" },
    { label: "Docker", categorie: "DIGITAL" },
    { label: "Terraform", categorie: "DIGITAL" },
    { label: "Python", categorie: "DIGITAL" },
    { label: "Java", categorie: "DIGITAL" },
    { label: "TypeScript", categorie: "DIGITAL" },
    { label: "React", categorie: "DIGITAL" },
    { label: "SAP", categorie: "DIGITAL" },
    { label: "ISTQB", categorie: "DIGITAL" },
    { label: "PMP", categorie: "DIGITAL" },
    { label: "Power BI", categorie: "DIGITAL" },
    { label: "SQL", categorie: "DIGITAL" },
    { label: "Siemens TIA Portal", categorie: "INDUSTRIE" },
    { label: "SCADA", categorie: "INDUSTRIE" },
    { label: "SolidWorks", categorie: "INDUSTRIE" },
    { label: "CATIA", categorie: "INDUSTRIE" },
    { label: "AutoCAD", categorie: "INDUSTRIE" },
    { label: "Ansys", categorie: "INDUSTRIE" },
    { label: "Automates programmables (API)", categorie: "INDUSTRIE" },
    { label: "GMAO", categorie: "INDUSTRIE" },
    { label: "Lean Manufacturing", categorie: "INDUSTRIE" },
    { label: "Six Sigma", categorie: "INDUSTRIE" },
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
      poste: "Responsable IT",
      telephone: "06 12 34 56 78",
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
    ville: string;
    rayonKm: number;
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
      ville: "Lyon",
      rayonKm: 100,
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
      ville: "Paris",
      rayonKm: 50,
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
      ville: "Rennes",
      rayonKm: 300,
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
      ville: "Toulouse",
      rayonKm: 50,
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
      ville: "Marseille",
      rayonKm: 150,
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
        villeRattachement: s.ville,
        villeLat: findVille(s.ville)?.lat ?? null,
        villeLng: findVille(s.ville)?.lng ?? null,
        rayonKm: s.rayonKm,
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
          create: s.competences.map((label, i) => ({
            competenceId: findComp(label).id,
            estCle: i < 2,
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
          create: s.langues.map((label, i) => ({
            langueId: findLangue(label).id,
            niveau: i === 0 ? 5 : 4,
            detail: i === 0 ? "Langue maternelle" : null,
          })),
        },
      },
    });
    console.log(`  ✓ ${consultant.referenceAnonyme} — ${consultant.intitulePoste}`);

    if (s.ref === "IND-017") {
      await prisma.competenceCategorie.createMany({
        data: [
          { consultantId: consultant.id, categorie: "DOMAINES", contenu: "Automatisme industriel, robotique, mise en service de lignes de production", niveau: 5, ordre: 0 },
          { consultantId: consultant.id, categorie: "LOGICIELS_OUTILS", contenu: "Siemens TIA Portal, SCADA, WinCC", niveau: 4, ordre: 1 },
          { consultantId: consultant.id, categorie: "METHODES_NORMES", contenu: "ISO 13849, Lean manufacturing", niveau: 4, ordre: 2 },
          { consultantId: consultant.id, categorie: "SECTEURS", contenu: "Automobile, industrie lourde", niveau: 4, ordre: 3 },
          { consultantId: consultant.id, categorie: "MANAGEMENT", contenu: "Pilotage d'équipe de 4 techniciens, relation client", niveau: 3, ordre: 4 },
        ],
      });
      await prisma.formation.createMany({
        data: [
          { consultantId: consultant.id, type: "FORMATION", annee: "2014", intitule: "Diplôme d'ingénieur en automatisme", etablissement: "École nationale d'ingénieurs", ordre: 0 },
          { consultantId: consultant.id, type: "CERTIFICATION", annee: "2020", intitule: "Certification Siemens TIA Portal Expert", etablissement: "Siemens", ordre: 1 },
        ],
      });
      await prisma.experience.createMany({
        data: [
          {
            consultantId: consultant.id,
            entreprise: "Entreprise cliente — équipementier automobile",
            secteurActivite: "Automobile",
            missionTitre: "Ingénieur automaticien senior",
            dateDebut: new Date(2023, 2, 1),
            dateFin: null,
            contexteObjectif:
              "Mise en service d'une nouvelle ligne d'assemblage pour un site de production à forte cadence.",
            realisations:
              "Réduction de 15% du temps d'arrêt machine grâce à l'optimisation des programmes automates\nMise en place de la supervision SCADA temps réel sur 3 lignes\nFormation de 6 techniciens de maintenance",
            environnementTechnique: "Siemens TIA Portal, SCADA, S7-1500",
            ordre: 0,
          },
          {
            consultantId: consultant.id,
            entreprise: "Entreprise cliente — sous-traitant aéronautique",
            secteurActivite: "Aéronautique",
            missionTitre: "Ingénieur automaticien",
            dateDebut: new Date(2020, 5, 1),
            dateFin: new Date(2023, 1, 1),
            contexteObjectif:
              "Modernisation du parc automates d'un atelier de production de pièces composites.",
            realisations:
              "Migration de 12 automates vers une architecture S7-1500\nRédaction des dossiers de sécurité machine (ISO 13849)",
            environnementTechnique: "Siemens TIA Portal, TwinCAT",
            ordre: 1,
          },
        ],
      });
    }
  }

  console.log("Seed — demandes du client de démonstration…");

  const consultantCyberSecu = await prisma.consultant.findUnique({
    where: { referenceAnonyme: "CY-023" },
  });
  if (consultantCyberSecu) {
    const existingContactRequest = await prisma.contactRequest.findFirst({
      where: { clientUserId: clientUser.id, consultantId: consultantCyberSecu.id },
    });
    if (!existingContactRequest) {
      await prisma.contactRequest.create({
        data: {
          consultantId: consultantCyberSecu.id,
          clientUserId: clientUser.id,
          besoin:
            "Nous cherchons un renfort pour un audit de sécurité de nos infrastructures cloud, démarrage rapide souhaité.",
          localisation: "Paris, hybride",
          status: "EN_COURS",
          bmNotifieId: consultantCyberSecu.businessManagerId,
        },
      });
    }
  }

  const existingDemandeBesoin = await prisma.demandeBesoin.findFirst({
    where: { clientUserId: clientUser.id, intitulePoste: "Chef de projet SI" },
  });
  if (!existingDemandeBesoin) {
    await prisma.demandeBesoin.create({
      data: {
        clientUserId: clientUser.id,
        intitulePoste: "Chef de projet SI",
        descriptifPoste:
          "Pilotage d'un programme de refonte du SI RH sur 8 mois, coordination de 3 équipes internes et de prestataires externes.",
        seniorite: "Senior",
        tjmCibleMin: 550,
        tjmCibleMax: 650,
        localisation: "Lyon",
        dureeEstimee: "6 à 12 mois",
        status: "NOUVELLE",
      },
    });
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
