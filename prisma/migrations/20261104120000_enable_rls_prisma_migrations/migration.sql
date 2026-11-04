-- La migration précédente (20260922212221_enable_row_level_security) a
-- activé RLS sur toutes les tables de notre schéma applicatif, mais pas sur
-- "_prisma_migrations" : cette table est créée automatiquement par Prisma
-- Migrate lui-même (hors de notre schema.prisma), donc absente de la liste
-- générée à l'époque. L'alerte Supabase "Table publicly accessible" la
-- signale malgré tout — elle ne contient que l'historique des migrations
-- (nom de fichier, date, checksum), aucune donnée métier, mais autant
-- fermer l'accès externe par cohérence avec le reste du schéma.
ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;
