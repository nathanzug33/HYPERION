-- Supabase expose automatiquement chaque table du schéma public via son API
-- REST (PostgREST), pour les rôles anon/authenticated, dès que la Row Level
-- Security (RLS) n'est pas activée dessus — indépendamment du fait que
-- l'appli l'utilise ou non (alerte Supabase "Table publicly accessible" /
-- "Sensitive data publicly accessible"). L'appli, elle, n'utilise jamais
-- cette API REST : Prisma se connecte directement en Postgres (rôle
-- propriétaire des tables via DATABASE_URL/DIRECT_URL), qui contourne la
-- RLS comme n'importe quel rôle propriétaire/superuser — l'activer ici ne
-- change donc rien au fonctionnement de l'appli, seulement à ce qui reste
-- accessible depuis l'extérieur via cette API REST. Aucune policy n'est
-- ajoutée (déjà inutile : rien ne doit passer par ce chemin), ce qui
-- revient à un refus par défaut pour anon/authenticated sur chaque table.

ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ClientOrganization" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PasswordResetToken" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SavedList" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Secteur" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Industrie" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Expertise" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Seniorite" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TypeMobilite" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ZoneGeographique" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Competence" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Langue" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Consultant" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ConsultantFichier" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SuiviCandidat" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Entreprise" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EntrepriseSecteurRecherche" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EntrepriseExpertiseRecherchee" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Contact" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SuiviCommercial" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Besoin" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BesoinCandidat" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Mission" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MissionJoursTravailles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Offre" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Candidature" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ConsultantSecteur" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ConsultantExpertise" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ConsultantCompetence" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ConsultantTypeMobilite" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ConsultantZoneGeographique" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ConsultantLangue" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CompetenceCategorie" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Formation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Experience" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ContactRequest" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DemandeBesoin" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LoginLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ConsultationLog" ENABLE ROW LEVEL SECURITY;
