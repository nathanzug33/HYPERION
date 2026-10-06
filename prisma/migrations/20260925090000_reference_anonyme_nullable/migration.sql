-- La référence anonyme (IND-xxx) n'est plus générée automatiquement à la
-- création d'un candidat (bruit inutile côté staff, qui identifie ses
-- candidats par leur nom) : elle n'est désormais produite à la volée que
-- lorsqu'un usage anonymisé en a réellement besoin (DC envoyé/exporté,
-- publication dans la bibliothèque client). La colonne doit donc accepter
-- NULL ; l'unicité reste garantie (Postgres autorise plusieurs NULL sous une
-- contrainte UNIQUE).
ALTER TABLE "Consultant" ALTER COLUMN "referenceAnonyme" DROP NOT NULL;
