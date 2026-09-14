-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
    "twoFactorSecret" TEXT,
    "lastLoginAt" TIMESTAMP(3),
    "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "googleAccessTokenEnc" TEXT,
    "googleRefreshTokenEnc" TEXT,
    "googleTokenExpiresAt" TIMESTAMP(3),
    "googleEmail" TEXT,
    "googleConnectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "poste" TEXT,
    "telephone" TEXT,
    "clientOrganizationId" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientOrganization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientOrganization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Secteur" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "categorie" TEXT,

    CONSTRAINT "Secteur_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Industrie" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Industrie_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expertise" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "categorie" TEXT,

    CONSTRAINT "Expertise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Seniorite" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "anneesMin" INTEGER,
    "anneesMax" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Seniorite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TypeMobilite" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "TypeMobilite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ZoneGeographique" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ZoneGeographique_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Competence" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "categorie" TEXT,

    CONSTRAINT "Competence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Langue" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Langue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Consultant" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "email" TEXT,
    "telephone" TEXT,
    "cvFileUrl" TEXT,
    "cvFileNomOriginal" TEXT,
    "notesEntretien" TEXT,
    "businessManagerId" TEXT NOT NULL,
    "dateRencontre" TIMESTAMP(3),
    "statutCandidatInterne" TEXT NOT NULL DEFAULT 'EN_COURS',
    "natureContrat" TEXT,
    "salaireBrutAnnuel" INTEGER,
    "tjmAchat" INTEGER,
    "fraisAnnuels" INTEGER,
    "consentementRgpd" BOOLEAN NOT NULL DEFAULT false,
    "consentementDate" TIMESTAMP(3),
    "consentementPublication" BOOLEAN NOT NULL DEFAULT false,
    "dateCollecte" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dureeConservationMois" INTEGER NOT NULL DEFAULT 24,
    "dateConservationLimite" TIMESTAMP(3),
    "referenceAnonyme" TEXT NOT NULL,
    "intitulePoste" TEXT,
    "seniorityId" TEXT,
    "anneesExperience" INTEGER,
    "resumeContexte" TEXT,
    "presentationCourte" TEXT,
    "disponibilite" TEXT,
    "disponibiliteConfirmeeLe" TIMESTAMP(3),
    "typeContrat" TEXT,
    "rayonKm" INTEGER,
    "ouvertGrandDeplacement" BOOLEAN NOT NULL DEFAULT false,
    "villeRattachement" TEXT,
    "villeLat" DOUBLE PRECISION,
    "villeLng" DOUBLE PRECISION,
    "statutPublication" TEXT NOT NULL DEFAULT 'BROUILLON',
    "datePublication" TIMESTAMP(3),
    "dateDepublication" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "genereParIA" BOOLEAN NOT NULL DEFAULT false,
    "sourceCvTexte" TEXT,
    "sourceTranscriptTexte" TEXT,

    CONSTRAINT "Consultant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SuiviCandidat" (
    "id" TEXT NOT NULL,
    "consultantId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "notes" TEXT,
    "dateProgrammee" TIMESTAMP(3),
    "fait" BOOLEAN NOT NULL DEFAULT false,
    "googleEventId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SuiviCandidat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Entreprise" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "secteurCategorie" TEXT,
    "industrieId" TEXT,
    "siteWeb" TEXT,
    "adresse" TEXT,
    "ville" TEXT,
    "codePostal" TEXT,
    "tailleEffectif" TEXT,
    "statutCommercial" TEXT NOT NULL DEFAULT 'PROSPECT',
    "notes" TEXT,
    "businessManagerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Entreprise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EntrepriseSecteurRecherche" (
    "entrepriseId" TEXT NOT NULL,
    "secteurId" TEXT NOT NULL,

    CONSTRAINT "EntrepriseSecteurRecherche_pkey" PRIMARY KEY ("entrepriseId","secteurId")
);

-- CreateTable
CREATE TABLE "EntrepriseExpertiseRecherchee" (
    "entrepriseId" TEXT NOT NULL,
    "expertiseId" TEXT NOT NULL,

    CONSTRAINT "EntrepriseExpertiseRecherchee_pkey" PRIMARY KEY ("entrepriseId","expertiseId")
);

-- CreateTable
CREATE TABLE "Contact" (
    "id" TEXT NOT NULL,
    "entrepriseId" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "fonction" TEXT,
    "email" TEXT,
    "telephone" TEXT,
    "notes" TEXT,
    "principal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SuiviCommercial" (
    "id" TEXT NOT NULL,
    "entrepriseId" TEXT NOT NULL,
    "contactId" TEXT,
    "consultantId" TEXT,
    "type" TEXT NOT NULL,
    "modalite" TEXT,
    "titre" TEXT NOT NULL,
    "notes" TEXT,
    "fichierUrl" TEXT,
    "fichierNomOriginal" TEXT,
    "dateProgrammee" TIMESTAMP(3),
    "fait" BOOLEAN NOT NULL DEFAULT false,
    "googleEventId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SuiviCommercial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Besoin" (
    "id" TEXT NOT NULL,
    "entrepriseId" TEXT NOT NULL,
    "contactId" TEXT,
    "businessManagerId" TEXT NOT NULL,
    "intitulePoste" TEXT NOT NULL,
    "descriptifMissions" TEXT,
    "seniorite" TEXT,
    "tjmCibleMin" INTEGER,
    "tjmCibleMax" INTEGER,
    "localisation" TEXT,
    "dateDemarrageSouhaitee" TIMESTAMP(3),
    "dureeEstimee" TEXT,
    "statut" TEXT NOT NULL DEFAULT 'OUVERT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Besoin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BesoinCandidat" (
    "id" TEXT NOT NULL,
    "besoinId" TEXT NOT NULL,
    "consultantId" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'PROPOSE',
    "dateRdvQualification" TIMESTAMP(3),
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BesoinCandidat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mission" (
    "id" TEXT NOT NULL,
    "besoinId" TEXT,
    "entrepriseId" TEXT NOT NULL,
    "consultantId" TEXT NOT NULL,
    "businessManagerId" TEXT NOT NULL,
    "intitulePoste" TEXT NOT NULL,
    "tjm" INTEGER,
    "dateDebut" TIMESTAMP(3) NOT NULL,
    "dateFinPrevue" TIMESTAMP(3),
    "dateFinReelle" TIMESTAMP(3),
    "statut" TEXT NOT NULL DEFAULT 'EN_COURS',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Mission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MissionJoursTravailles" (
    "id" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "annee" INTEGER NOT NULL,
    "mois" INTEGER NOT NULL,
    "joursTravailles" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MissionJoursTravailles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Offre" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "descriptif" TEXT,
    "profilRecherche" TEXT,
    "typeContratOffre" TEXT,
    "tjmMin" INTEGER,
    "tjmMax" INTEGER,
    "salaireMin" INTEGER,
    "salaireMax" INTEGER,
    "localisation" TEXT,
    "dateDemarrage" TIMESTAMP(3),
    "statut" TEXT NOT NULL DEFAULT 'BROUILLON',
    "datePublication" TIMESTAMP(3),
    "dateDepublication" TIMESTAMP(3),
    "besoinId" TEXT,
    "entrepriseId" TEXT,
    "businessManagerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Offre_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Candidature" (
    "id" TEXT NOT NULL,
    "offreId" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telephone" TEXT,
    "message" TEXT,
    "cvFileUrl" TEXT,
    "cvFileNomOriginal" TEXT,
    "consentementRgpd" BOOLEAN NOT NULL DEFAULT false,
    "statut" TEXT NOT NULL DEFAULT 'NOUVELLE',
    "consultantId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Candidature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsultantSecteur" (
    "consultantId" TEXT NOT NULL,
    "secteurId" TEXT NOT NULL,

    CONSTRAINT "ConsultantSecteur_pkey" PRIMARY KEY ("consultantId","secteurId")
);

-- CreateTable
CREATE TABLE "ConsultantExpertise" (
    "consultantId" TEXT NOT NULL,
    "expertiseId" TEXT NOT NULL,

    CONSTRAINT "ConsultantExpertise_pkey" PRIMARY KEY ("consultantId","expertiseId")
);

-- CreateTable
CREATE TABLE "ConsultantCompetence" (
    "consultantId" TEXT NOT NULL,
    "competenceId" TEXT NOT NULL,
    "estCle" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ConsultantCompetence_pkey" PRIMARY KEY ("consultantId","competenceId")
);

-- CreateTable
CREATE TABLE "ConsultantTypeMobilite" (
    "consultantId" TEXT NOT NULL,
    "typeMobiliteId" TEXT NOT NULL,

    CONSTRAINT "ConsultantTypeMobilite_pkey" PRIMARY KEY ("consultantId","typeMobiliteId")
);

-- CreateTable
CREATE TABLE "ConsultantZoneGeographique" (
    "consultantId" TEXT NOT NULL,
    "zoneGeographiqueId" TEXT NOT NULL,

    CONSTRAINT "ConsultantZoneGeographique_pkey" PRIMARY KEY ("consultantId","zoneGeographiqueId")
);

-- CreateTable
CREATE TABLE "ConsultantLangue" (
    "consultantId" TEXT NOT NULL,
    "langueId" TEXT NOT NULL,
    "niveau" INTEGER NOT NULL DEFAULT 3,
    "detail" TEXT,

    CONSTRAINT "ConsultantLangue_pkey" PRIMARY KEY ("consultantId","langueId")
);

-- CreateTable
CREATE TABLE "CompetenceCategorie" (
    "id" TEXT NOT NULL,
    "consultantId" TEXT NOT NULL,
    "categorie" TEXT NOT NULL,
    "contenu" TEXT NOT NULL,
    "niveau" INTEGER NOT NULL DEFAULT 3,
    "ordre" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CompetenceCategorie_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Formation" (
    "id" TEXT NOT NULL,
    "consultantId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "annee" TEXT NOT NULL,
    "intitule" TEXT NOT NULL,
    "etablissement" TEXT,
    "ordre" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Formation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Experience" (
    "id" TEXT NOT NULL,
    "consultantId" TEXT NOT NULL,
    "entreprise" TEXT NOT NULL,
    "secteurActivite" TEXT,
    "missionTitre" TEXT NOT NULL,
    "dateDebut" TIMESTAMP(3),
    "dateFin" TIMESTAMP(3),
    "contexteObjectif" TEXT,
    "realisations" TEXT,
    "environnementTechnique" TEXT,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Experience_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactRequest" (
    "id" TEXT NOT NULL,
    "consultantId" TEXT NOT NULL,
    "clientUserId" TEXT NOT NULL,
    "besoin" TEXT NOT NULL,
    "localisation" TEXT,
    "dateDemarrageSouhaitee" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'NOUVELLE',
    "bmNotifieId" TEXT,
    "reponseNote" TEXT,
    "reponduLe" TIMESTAMP(3),
    "reponduParId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContactRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DemandeBesoin" (
    "id" TEXT NOT NULL,
    "clientUserId" TEXT NOT NULL,
    "intitulePoste" TEXT NOT NULL,
    "descriptifPoste" TEXT NOT NULL,
    "seniorite" TEXT,
    "tjmCibleMin" INTEGER,
    "tjmCibleMax" INTEGER,
    "localisation" TEXT,
    "dateDemarrageSouhaitee" TIMESTAMP(3),
    "dureeEstimee" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NOUVELLE',
    "reponseNote" TEXT,
    "reponduLe" TIMESTAMP(3),
    "reponduParId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DemandeBesoin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoginLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoginLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsultationLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "consultantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsultationLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_clientOrganizationId_idx" ON "User"("clientOrganizationId");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_token_key" ON "PasswordResetToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "Secteur_label_key" ON "Secteur"("label");

-- CreateIndex
CREATE UNIQUE INDEX "Industrie_label_key" ON "Industrie"("label");

-- CreateIndex
CREATE UNIQUE INDEX "Expertise_label_key" ON "Expertise"("label");

-- CreateIndex
CREATE UNIQUE INDEX "Seniorite_label_key" ON "Seniorite"("label");

-- CreateIndex
CREATE UNIQUE INDEX "TypeMobilite_label_key" ON "TypeMobilite"("label");

-- CreateIndex
CREATE UNIQUE INDEX "ZoneGeographique_label_key" ON "ZoneGeographique"("label");

-- CreateIndex
CREATE UNIQUE INDEX "Competence_label_key" ON "Competence"("label");

-- CreateIndex
CREATE UNIQUE INDEX "Langue_label_key" ON "Langue"("label");

-- CreateIndex
CREATE UNIQUE INDEX "Consultant_referenceAnonyme_key" ON "Consultant"("referenceAnonyme");

-- CreateIndex
CREATE INDEX "Consultant_statutPublication_idx" ON "Consultant"("statutPublication");

-- CreateIndex
CREATE INDEX "Consultant_businessManagerId_idx" ON "Consultant"("businessManagerId");

-- CreateIndex
CREATE INDEX "Consultant_seniorityId_idx" ON "Consultant"("seniorityId");

-- CreateIndex
CREATE INDEX "SuiviCandidat_consultantId_idx" ON "SuiviCandidat"("consultantId");

-- CreateIndex
CREATE INDEX "SuiviCandidat_dateProgrammee_idx" ON "SuiviCandidat"("dateProgrammee");

-- CreateIndex
CREATE INDEX "Entreprise_businessManagerId_idx" ON "Entreprise"("businessManagerId");

-- CreateIndex
CREATE INDEX "Entreprise_statutCommercial_idx" ON "Entreprise"("statutCommercial");

-- CreateIndex
CREATE INDEX "Contact_entrepriseId_idx" ON "Contact"("entrepriseId");

-- CreateIndex
CREATE INDEX "SuiviCommercial_entrepriseId_idx" ON "SuiviCommercial"("entrepriseId");

-- CreateIndex
CREATE INDEX "SuiviCommercial_contactId_idx" ON "SuiviCommercial"("contactId");

-- CreateIndex
CREATE INDEX "SuiviCommercial_consultantId_idx" ON "SuiviCommercial"("consultantId");

-- CreateIndex
CREATE INDEX "SuiviCommercial_dateProgrammee_idx" ON "SuiviCommercial"("dateProgrammee");

-- CreateIndex
CREATE INDEX "Besoin_entrepriseId_idx" ON "Besoin"("entrepriseId");

-- CreateIndex
CREATE INDEX "Besoin_businessManagerId_idx" ON "Besoin"("businessManagerId");

-- CreateIndex
CREATE INDEX "Besoin_statut_idx" ON "Besoin"("statut");

-- CreateIndex
CREATE INDEX "BesoinCandidat_besoinId_idx" ON "BesoinCandidat"("besoinId");

-- CreateIndex
CREATE INDEX "BesoinCandidat_consultantId_idx" ON "BesoinCandidat"("consultantId");

-- CreateIndex
CREATE UNIQUE INDEX "BesoinCandidat_besoinId_consultantId_key" ON "BesoinCandidat"("besoinId", "consultantId");

-- CreateIndex
CREATE INDEX "Mission_entrepriseId_idx" ON "Mission"("entrepriseId");

-- CreateIndex
CREATE INDEX "Mission_consultantId_idx" ON "Mission"("consultantId");

-- CreateIndex
CREATE INDEX "Mission_businessManagerId_idx" ON "Mission"("businessManagerId");

-- CreateIndex
CREATE INDEX "Mission_statut_idx" ON "Mission"("statut");

-- CreateIndex
CREATE INDEX "MissionJoursTravailles_missionId_idx" ON "MissionJoursTravailles"("missionId");

-- CreateIndex
CREATE UNIQUE INDEX "MissionJoursTravailles_missionId_annee_mois_key" ON "MissionJoursTravailles"("missionId", "annee", "mois");

-- CreateIndex
CREATE UNIQUE INDEX "Offre_reference_key" ON "Offre"("reference");

-- CreateIndex
CREATE INDEX "Offre_besoinId_idx" ON "Offre"("besoinId");

-- CreateIndex
CREATE INDEX "Offre_entrepriseId_idx" ON "Offre"("entrepriseId");

-- CreateIndex
CREATE INDEX "Offre_businessManagerId_idx" ON "Offre"("businessManagerId");

-- CreateIndex
CREATE INDEX "Offre_statut_idx" ON "Offre"("statut");

-- CreateIndex
CREATE INDEX "Candidature_offreId_idx" ON "Candidature"("offreId");

-- CreateIndex
CREATE INDEX "Candidature_statut_idx" ON "Candidature"("statut");

-- CreateIndex
CREATE INDEX "CompetenceCategorie_consultantId_idx" ON "CompetenceCategorie"("consultantId");

-- CreateIndex
CREATE INDEX "Formation_consultantId_idx" ON "Formation"("consultantId");

-- CreateIndex
CREATE INDEX "Experience_consultantId_idx" ON "Experience"("consultantId");

-- CreateIndex
CREATE INDEX "ContactRequest_consultantId_idx" ON "ContactRequest"("consultantId");

-- CreateIndex
CREATE INDEX "ContactRequest_clientUserId_idx" ON "ContactRequest"("clientUserId");

-- CreateIndex
CREATE INDEX "ContactRequest_status_idx" ON "ContactRequest"("status");

-- CreateIndex
CREATE INDEX "DemandeBesoin_clientUserId_idx" ON "DemandeBesoin"("clientUserId");

-- CreateIndex
CREATE INDEX "DemandeBesoin_status_idx" ON "DemandeBesoin"("status");

-- CreateIndex
CREATE INDEX "LoginLog_userId_idx" ON "LoginLog"("userId");

-- CreateIndex
CREATE INDEX "LoginLog_createdAt_idx" ON "LoginLog"("createdAt");

-- CreateIndex
CREATE INDEX "ConsultationLog_userId_idx" ON "ConsultationLog"("userId");

-- CreateIndex
CREATE INDEX "ConsultationLog_consultantId_idx" ON "ConsultationLog"("consultantId");

-- CreateIndex
CREATE INDEX "ConsultationLog_createdAt_idx" ON "ConsultationLog"("createdAt");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_clientOrganizationId_fkey" FOREIGN KEY ("clientOrganizationId") REFERENCES "ClientOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consultant" ADD CONSTRAINT "Consultant_businessManagerId_fkey" FOREIGN KEY ("businessManagerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consultant" ADD CONSTRAINT "Consultant_seniorityId_fkey" FOREIGN KEY ("seniorityId") REFERENCES "Seniorite"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SuiviCandidat" ADD CONSTRAINT "SuiviCandidat_consultantId_fkey" FOREIGN KEY ("consultantId") REFERENCES "Consultant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SuiviCandidat" ADD CONSTRAINT "SuiviCandidat_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Entreprise" ADD CONSTRAINT "Entreprise_industrieId_fkey" FOREIGN KEY ("industrieId") REFERENCES "Industrie"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Entreprise" ADD CONSTRAINT "Entreprise_businessManagerId_fkey" FOREIGN KEY ("businessManagerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntrepriseSecteurRecherche" ADD CONSTRAINT "EntrepriseSecteurRecherche_entrepriseId_fkey" FOREIGN KEY ("entrepriseId") REFERENCES "Entreprise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntrepriseSecteurRecherche" ADD CONSTRAINT "EntrepriseSecteurRecherche_secteurId_fkey" FOREIGN KEY ("secteurId") REFERENCES "Secteur"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntrepriseExpertiseRecherchee" ADD CONSTRAINT "EntrepriseExpertiseRecherchee_entrepriseId_fkey" FOREIGN KEY ("entrepriseId") REFERENCES "Entreprise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntrepriseExpertiseRecherchee" ADD CONSTRAINT "EntrepriseExpertiseRecherchee_expertiseId_fkey" FOREIGN KEY ("expertiseId") REFERENCES "Expertise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_entrepriseId_fkey" FOREIGN KEY ("entrepriseId") REFERENCES "Entreprise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SuiviCommercial" ADD CONSTRAINT "SuiviCommercial_entrepriseId_fkey" FOREIGN KEY ("entrepriseId") REFERENCES "Entreprise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SuiviCommercial" ADD CONSTRAINT "SuiviCommercial_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SuiviCommercial" ADD CONSTRAINT "SuiviCommercial_consultantId_fkey" FOREIGN KEY ("consultantId") REFERENCES "Consultant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SuiviCommercial" ADD CONSTRAINT "SuiviCommercial_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Besoin" ADD CONSTRAINT "Besoin_entrepriseId_fkey" FOREIGN KEY ("entrepriseId") REFERENCES "Entreprise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Besoin" ADD CONSTRAINT "Besoin_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Besoin" ADD CONSTRAINT "Besoin_businessManagerId_fkey" FOREIGN KEY ("businessManagerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BesoinCandidat" ADD CONSTRAINT "BesoinCandidat_besoinId_fkey" FOREIGN KEY ("besoinId") REFERENCES "Besoin"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BesoinCandidat" ADD CONSTRAINT "BesoinCandidat_consultantId_fkey" FOREIGN KEY ("consultantId") REFERENCES "Consultant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BesoinCandidat" ADD CONSTRAINT "BesoinCandidat_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mission" ADD CONSTRAINT "Mission_besoinId_fkey" FOREIGN KEY ("besoinId") REFERENCES "Besoin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mission" ADD CONSTRAINT "Mission_entrepriseId_fkey" FOREIGN KEY ("entrepriseId") REFERENCES "Entreprise"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mission" ADD CONSTRAINT "Mission_consultantId_fkey" FOREIGN KEY ("consultantId") REFERENCES "Consultant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mission" ADD CONSTRAINT "Mission_businessManagerId_fkey" FOREIGN KEY ("businessManagerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MissionJoursTravailles" ADD CONSTRAINT "MissionJoursTravailles_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offre" ADD CONSTRAINT "Offre_besoinId_fkey" FOREIGN KEY ("besoinId") REFERENCES "Besoin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offre" ADD CONSTRAINT "Offre_entrepriseId_fkey" FOREIGN KEY ("entrepriseId") REFERENCES "Entreprise"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offre" ADD CONSTRAINT "Offre_businessManagerId_fkey" FOREIGN KEY ("businessManagerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Candidature" ADD CONSTRAINT "Candidature_offreId_fkey" FOREIGN KEY ("offreId") REFERENCES "Offre"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Candidature" ADD CONSTRAINT "Candidature_consultantId_fkey" FOREIGN KEY ("consultantId") REFERENCES "Consultant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultantSecteur" ADD CONSTRAINT "ConsultantSecteur_consultantId_fkey" FOREIGN KEY ("consultantId") REFERENCES "Consultant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultantSecteur" ADD CONSTRAINT "ConsultantSecteur_secteurId_fkey" FOREIGN KEY ("secteurId") REFERENCES "Secteur"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultantExpertise" ADD CONSTRAINT "ConsultantExpertise_consultantId_fkey" FOREIGN KEY ("consultantId") REFERENCES "Consultant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultantExpertise" ADD CONSTRAINT "ConsultantExpertise_expertiseId_fkey" FOREIGN KEY ("expertiseId") REFERENCES "Expertise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultantCompetence" ADD CONSTRAINT "ConsultantCompetence_consultantId_fkey" FOREIGN KEY ("consultantId") REFERENCES "Consultant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultantCompetence" ADD CONSTRAINT "ConsultantCompetence_competenceId_fkey" FOREIGN KEY ("competenceId") REFERENCES "Competence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultantTypeMobilite" ADD CONSTRAINT "ConsultantTypeMobilite_consultantId_fkey" FOREIGN KEY ("consultantId") REFERENCES "Consultant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultantTypeMobilite" ADD CONSTRAINT "ConsultantTypeMobilite_typeMobiliteId_fkey" FOREIGN KEY ("typeMobiliteId") REFERENCES "TypeMobilite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultantZoneGeographique" ADD CONSTRAINT "ConsultantZoneGeographique_consultantId_fkey" FOREIGN KEY ("consultantId") REFERENCES "Consultant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultantZoneGeographique" ADD CONSTRAINT "ConsultantZoneGeographique_zoneGeographiqueId_fkey" FOREIGN KEY ("zoneGeographiqueId") REFERENCES "ZoneGeographique"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultantLangue" ADD CONSTRAINT "ConsultantLangue_consultantId_fkey" FOREIGN KEY ("consultantId") REFERENCES "Consultant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultantLangue" ADD CONSTRAINT "ConsultantLangue_langueId_fkey" FOREIGN KEY ("langueId") REFERENCES "Langue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetenceCategorie" ADD CONSTRAINT "CompetenceCategorie_consultantId_fkey" FOREIGN KEY ("consultantId") REFERENCES "Consultant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Formation" ADD CONSTRAINT "Formation_consultantId_fkey" FOREIGN KEY ("consultantId") REFERENCES "Consultant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Experience" ADD CONSTRAINT "Experience_consultantId_fkey" FOREIGN KEY ("consultantId") REFERENCES "Consultant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactRequest" ADD CONSTRAINT "ContactRequest_consultantId_fkey" FOREIGN KEY ("consultantId") REFERENCES "Consultant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactRequest" ADD CONSTRAINT "ContactRequest_clientUserId_fkey" FOREIGN KEY ("clientUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactRequest" ADD CONSTRAINT "ContactRequest_bmNotifieId_fkey" FOREIGN KEY ("bmNotifieId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactRequest" ADD CONSTRAINT "ContactRequest_reponduParId_fkey" FOREIGN KEY ("reponduParId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DemandeBesoin" ADD CONSTRAINT "DemandeBesoin_clientUserId_fkey" FOREIGN KEY ("clientUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DemandeBesoin" ADD CONSTRAINT "DemandeBesoin_reponduParId_fkey" FOREIGN KEY ("reponduParId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoginLog" ADD CONSTRAINT "LoginLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultationLog" ADD CONSTRAINT "ConsultationLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultationLog" ADD CONSTRAINT "ConsultationLog_consultantId_fkey" FOREIGN KEY ("consultantId") REFERENCES "Consultant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

