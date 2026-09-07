# Bibliothèque de dossiers de compétences

Portail client à accès réservé permettant de consulter une bibliothèque de
profils de consultants **anonymisés**, avec back-office de gestion pour les
business managers et l'administrateur. Implémente le MVP (version 1) décrit
dans le cahier des charges (`cahierdeschargesbibliothequedc.md`).

## Stack technique

- **Next.js 16** (App Router, Server Actions, TypeScript, Tailwind CSS v4)
- **Prisma** + **SQLite** en local/démo (bascule facile vers PostgreSQL — voir
  plus bas), aucun type spécifique à SQLite n'est utilisé (pas d'enum natif,
  pas de tableau scalaire) : le schéma est portable tel quel.
- **NextAuth v5** (Credentials + JWT), pas d'auto-inscription
- Aucune dépendance externe pour l'envoi d'email en développement (les
  emails sont journalisés en console — voir `src/lib/mail.ts`)
- **Génération de dossiers assistée par IA** (`@anthropic-ai/sdk`, modèle
  Claude Opus) : CV + transcription d'entretien → dossier structuré
  pré-rempli, optionnelle (nécessite `ANTHROPIC_API_KEY`)
- **Charte graphique HYPERION** appliquée (bleus/vert extraits du gabarit
  officiel), sans logo — voir `src/app/globals.css`
- **Export Word (.docx)** du dossier au gabarit HYPERION (`docx` npm),
  généré à la volée, réservé au back-office — voir `src/lib/dc-docx.ts`

## Démarrage

```bash
npm install
cp .env.example .env        # adapter AUTH_SECRET en production
npm run db:migrate          # crée prisma/dev.db et applique le schéma
npm run db:seed             # comptes de démonstration + données d'exemple
npm run dev
```

Application sur http://localhost:3000.

### Comptes de démonstration (mot de passe : `ChangeMe!2024`)

| Rôle | Email |
|---|---|
| Administrateur | admin@societe-conseil.fr |
| Business manager | sophie.martin@societe-conseil.fr |
| Business manager | karim.benali@societe-conseil.fr |
| Client | contact@client-demo.fr |

## Structure et correspondance avec le cahier des charges

- **§2 Principes structurants** — un seul enregistrement `Consultant`
  (`prisma/schema.prisma`) porte à la fois les champs internes (nominatifs)
  et les champs exposables (projection anonymisée). La bibliothèque client
  ne lit jamais que la projection `consultantPublicSelect`
  (`src/lib/consultant-view.ts`), qui exclut structurellement tout champ
  interne — impossible d'exposer une donnée nominative par erreur d'écran.
- **§5.1 Authentification** — `src/auth.ts`, `src/proxy.ts` (middleware de
  routes), comptes créés uniquement par un administrateur
  (`src/app/admin/utilisateurs`), session JWT avec expiration d'inactivité
  (`SESSION_IDLE_TIMEOUT_MINUTES`).
- **§5.2 Back-office** — `src/app/admin/consultants` : saisie interne +
  exposable dans un même formulaire, statut de publication, alerte de
  fraîcheur (`FICHE_FRAICHEUR_SEUIL_JOURS`), **aperçu anonymisé en direct**
  avant publication (panneau latéral utilisant le même composant que la vue
  client), garde-fous de publication (champs obligatoires + consentements).
- **§5.3/§7 Bibliothèque client** — `src/app/bibliotheque` : cartes,
  recherche plein texte, filtres combinables (ET entre catégories, OU au
  sein d'une catégorie), tri, message si aucun résultat.
- **§5.4 Demande de contact** — `src/components/consultant/ContactRequestButton.tsx`
  + `src/app/bibliotheque/actions.ts` : formulaire, enregistrement,
  notification au BM référent.
- **§5.5 Journalisation** — `LoginLog`, `ConsultationLog`, `ContactRequest`
  + pages `src/app/admin/journaux` avec export CSV.
- **§6.3 Mobilité** — modèle dédié (type, zones, rayon, grand déplacement,
  zone de rattachement large — jamais l'adresse précise).
- **§7 Référentiels** — Secteur, Expertise, Séniorité, TypeMobilité,
  ZoneGéographique, Compétence, Langue : paramétrables par l'admin
  (`src/app/admin/referentiels`), jamais codés en dur dans l'UI.
- **§8 RGPD** — consentement horodaté (vivier + publication séparés), durée
  de conservation par dossier avec alerte de purge sur le tableau de bord
  admin, suppression définitive (droit à l'effacement) réservée à l'admin,
  mentions légales et politique de confidentialité (`src/app/legal`),
  bandeau cookies minimal (cookies techniques uniquement).
- **§9 Non-fonctionnel** — mots de passe hachés (bcrypt), toutes les routes
  protégées par middleware + garde-fous serveur (défense en profondeur,
  `src/lib/guards.ts`), accès à la bibliothèque strictement authentifié
  (pas de scraping anonyme).

## Génération de dossiers assistée par IA

Depuis `Dossiers de compétences → Générer avec l'IA` (`/admin/consultants/generer-ia`),
un BM/admin dépose un fichier CV (ou un dossier déjà existant, même dans un
autre format que celui d'HYPERION) — `.pdf`, `.doc`, `.docx` ou `.txt` —
c'est le seul document obligatoire. La transcription de l'entretien est
facultative (même formats) : pas encore fait l'entretien, ou dossier reçu
directement du candidat ? On peut générer avec le CV seul. L'IA (Claude,
extraction structurée stricte via `output_config.format`) génère un
dossier complet au gabarit HYPERION — poste, séniorité, mobilité,
disponibilité, résumé, compétences par catégorie avec niveaux, langues
avec niveaux, formations et jusqu'à 4 expériences détaillées avec
réalisations. Les valeurs des référentiels paramétrables (secteurs,
expertises, séniorité, mobilité, zones) sont fournies au modèle comme
vocabulaire fermé pour rester cohérentes avec l'existant ; les
compétences/langues libres sont créées automatiquement si absentes du
référentiel.

Extraction de texte : `.pdf` et `.docx` sont gérés nativement (aucune
dépendance système). Les `.doc` (ancien format binaire Word) passent par
une conversion LibreOffice (`soffice`) si elle est installée sur la
machine qui exécute le serveur — sinon un message explicite invite à
enregistrer le fichier en `.docx`/`.pdf`. Un PDF scanné (image sans texte
sélectionnable) est aussi signalé explicitement plutôt que de générer un
dossier vide.

Le dossier est **toujours créé en brouillon** : conformément au principe
« aperçu obligatoire avant publication » du cahier des charges (§5.2/§8),
la génération IA ne peut pas certifier elle-même le consentement RGPD ni
garantir l'absence totale de donnée identifiante dans un texte libre — le
BM doit relire l'aperçu, cocher les consentements, compléter le nom si
besoin, puis publier. La création manuelle reste disponible en parallèle
(`+ Saisie manuelle`).

La limite de taille des fichiers envoyés est portée à 20 Mo
(`next.config.ts` → `experimental.serverActions.bodySizeLimit`, le défaut
Next.js de 1 Mo est trop juste pour un CV PDF avec photo).

Fonctionnalité optionnelle : sans `ANTHROPIC_API_KEY` dans `.env`, la page
affiche un message et redirige vers la saisie manuelle — le reste de
l'application n'est pas impacté.

**Erreur « This API key is not scoped to a workspace »** : certaines clés
API Anthropic créées au niveau organisation (et non d'un workspace précis)
exigent un en-tête supplémentaire. Deux solutions :
- **Recommandé** : dans la Console Anthropic, créez une clé API rattachée
  directement à un workspace.
- **Alternative** : renseignez `ANTHROPIC_WORKSPACE_ID` dans `.env` avec
  l'identifiant du workspace à utiliser (la clé existante fonctionne alors
  telle quelle).

## Export Word (.docx) du dossier

Sur la fiche d'un dossier (`/admin/consultants/{id}`), le bouton
« Télécharger le DC (Word) » génère à la volée un `.docx` modifiable
reprenant les sections du gabarit HYPERION (couleurs, 01 à 05), avec les
**données nominatives complètes** (nom, contact, TJM) — c'est le
« dossier nominatif complet » présenté au client en fin de cycle
commercial (§1 du cahier des charges), à envoyer manuellement (email…)
une fois la mission confirmée.

**Ce bouton n'existe que dans le back-office.** Il n'est jamais exposé
dans la bibliothèque client — la fiche que voient les clients reste la
projection anonymisée habituelle. Génération : `src/lib/dc-docx.ts`
(librairie `docx`), route `src/app/admin/consultants/[id]/export-word/route.ts`.

## Passage en production

- **Base de données** : changer `provider = "sqlite"` en `"postgresql"`
  dans `prisma/schema.prisma`, pointer `DATABASE_URL` vers une instance
  PostgreSQL hébergée dans l'UE, puis `npx prisma migrate deploy`. Aucun
  champ du schéma n'est spécifique à SQLite.
- **Email** : brancher un fournisseur transactionnel réel dans
  `src/lib/mail.ts` (SMTP, Resend, Postmark…) — actuellement les emails
  sont uniquement journalisés côté serveur.
- **Secrets** : générer un `AUTH_SECRET` fort et dédié par environnement.
  Ajouter `ANTHROPIC_API_KEY` pour activer la génération assistée par IA.
- **Synchronisation ATS/CRM (hors MVP, §3.2/§9)** : le modèle de données
  sépare déjà nettement champs internes/exposables et référentiels ; un
  point d'API d'import/synchronisation peut être ajouté sans refonte, par
  exemple des routes `route.ts` sous `src/app/api/` réutilisant les mêmes
  fonctions de validation que les Server Actions actuelles.
- **Mentions légales / politique de confidentialité** : compléter les
  gabarits dans `src/app/legal` avec les informations réelles de la société
  avant mise en ligne.

## Commandes utiles

```bash
npm run dev          # serveur de développement
npm run build         # build de production
npm run lint          # ESLint
npm run db:migrate    # migrations Prisma (dev)
npm run db:seed       # réinitialise les données de démonstration
npm run db:studio     # explorateur de données Prisma
```

## Hors périmètre du MVP (§3.2)

Non implémentés volontairement dans cette v1 : intégration ATS/CRM externe,
espace personnalisé par client, messagerie intégrée, statistiques
analytiques avancées, application mobile native.
