"use client";

import { useState } from "react";
import type {
  CompetenceCategorie,
  Consultant,
  ConsultantCompetence,
  ConsultantExpertise,
  ConsultantLangue,
  ConsultantSecteur,
  ConsultantTypeMobilite,
  ConsultantZoneGeographique,
  Experience,
  Formation,
  User,
} from "@prisma/client";
import CheckboxGroup from "@/components/form/CheckboxGroup";
import LangueNiveauGroup from "@/components/form/LangueNiveauGroup";
import NatureContratFields from "@/components/NatureContratFields";
import {
  DISPONIBILITE_LABELS,
  STATUT_CANDIDAT_INTERNE_LABELS,
  TYPE_CONTRAT_LABELS,
} from "@/lib/constants";
import { updateConsultantAction } from "../actions";
import { regenerateDcFromIaAction } from "./dc-actions";
import { VILLES_FRANCE } from "@/lib/villes-france";

type ConsultantWithRelations = Consultant & {
  secteurs: ConsultantSecteur[];
  expertises: ConsultantExpertise[];
  competences: ConsultantCompetence[];
  typesMobilite: ConsultantTypeMobilite[];
  zonesGeographiques: ConsultantZoneGeographique[];
  langues: ConsultantLangue[];
  competenceCategories: CompetenceCategorie[];
  formations: Formation[];
  experiences: Experience[];
};

type Referential = { id: string; label: string };
type CategorizedReferential = Referential & { categorie: string | null };

const TABS = [
  { key: "info", label: "Informations" },
  { key: "competences", label: "Compétences" },
  { key: "secteurs", label: "Secteurs" },
  { key: "pieces", label: "Pièces jointes" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

function splitByCategorie(items: CategorizedReferential[]) {
  return {
    it: items.filter((i) => i.categorie === "DIGITAL"),
    industrie: items.filter((i) => i.categorie === "INDUSTRIE"),
    nonClasse: items.filter((i) => i.categorie !== "DIGITAL" && i.categorie !== "INDUSTRIE"),
  };
}

export default function ConsultantEditForm({
  consultant,
  referentials,
  canReassignReferent,
}: {
  consultant: ConsultantWithRelations;
  referentials: {
    secteurs: CategorizedReferential[];
    expertises: CategorizedReferential[];
    seniorites: Referential[];
    typesMobilite: Referential[];
    zones: Referential[];
    competences: CategorizedReferential[];
    langues: Referential[];
    bms: User[];
  };
  canReassignReferent: boolean;
}) {
  const [tab, setTab] = useState<TabKey>("info");

  const fmtDate = (d: Date | null) =>
    d ? new Date(d).toISOString().slice(0, 10) : "";

  const secteursSplit = splitByCategorie(referentials.secteurs);
  const expertisesSplit = splitByCategorie(referentials.expertises);
  const competencesSplit = splitByCategorie(referentials.competences);

  const secteurIdsSelected = new Set(consultant.secteurs.map((s) => s.secteurId));
  const expertiseIdsSelected = new Set(consultant.expertises.map((e) => e.expertiseId));
  const competenceIdsSelected = new Set(consultant.competences.map((c) => c.competenceId));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1 text-sm">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`rounded-md px-3 py-1.5 font-medium transition-colors ${
              tab === t.key
                ? "bg-white text-brand-ink shadow-sm"
                : "text-brand-gray hover:text-brand-ink"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <form action={updateConsultantAction} className="space-y-6">
        <input type="hidden" name="id" value={consultant.id} />

        {/* --- Informations --------------------------------------------- */}
        <div hidden={tab !== "info"} className="space-y-6">
          <fieldset className="card p-5 space-y-4">
            <legend className="px-1 text-sm font-semibold uppercase tracking-wide text-brand-blue-dark">
              Identité & contact
            </legend>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Prénom">
                <input name="prenom" defaultValue={consultant.prenom} required className="input" />
              </Field>
              <Field label="Nom">
                <input name="nom" defaultValue={consultant.nom} required className="input" />
              </Field>
              <Field label="Email">
                <input name="email" type="email" defaultValue={consultant.email ?? ""} className="input" />
              </Field>
              <Field label="Téléphone">
                <input name="telephone" defaultValue={consultant.telephone ?? ""} className="input" />
              </Field>
              <Field label="Disponibilité">
                <select name="disponibilite" defaultValue={consultant.disponibilite ?? ""} className="input">
                  <option value="">—</option>
                  {Object.entries(DISPONIBILITE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Type de contrat envisageable">
                <select name="typeContrat" defaultValue={consultant.typeContrat ?? ""} className="input">
                  <option value="">—</option>
                  {Object.entries(TYPE_CONTRAT_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </fieldset>

          <fieldset className="card p-5 space-y-3">
            <legend className="px-1 text-sm font-semibold uppercase tracking-wide text-brand-blue-dark">
              Mobilité (critère éliminatoire — à renseigner avec soin)
            </legend>
            <Field label="Type(s) de mobilité">
              <CheckboxGroup
                name="typeMobiliteIds"
                options={referentials.typesMobilite}
                selectedIds={new Set(consultant.typesMobilite.map((m) => m.typeMobiliteId))}
              />
            </Field>
            <Field label="Région(s) de préférence">
              <CheckboxGroup
                name="zoneIds"
                options={referentials.zones}
                selectedIds={new Set(consultant.zonesGeographiques.map((z) => z.zoneGeographiqueId))}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Ville de rattachement">
                <input
                  name="villeRattachement"
                  defaultValue={consultant.villeRattachement ?? ""}
                  list="villes-france"
                  placeholder="Ex. Lyon"
                  className="input"
                />
              </Field>
              <Field label="Rayon accepté (km)">
                <input name="rayonKm" type="number" defaultValue={consultant.rayonKm ?? ""} className="input" />
              </Field>
            </div>
            <label className="flex items-center gap-2 text-sm text-brand-body">
              <input
                type="checkbox"
                name="ouvertGrandDeplacement"
                defaultChecked={consultant.ouvertGrandDeplacement}
                className="h-4 w-4 rounded border-slate-300 text-brand-blue focus:ring-brand-blue"
              />
              Ouvert au grand déplacement (découchés)
            </label>
          </fieldset>

          <fieldset className="card p-5 space-y-4">
            <legend className="px-1 text-sm font-semibold uppercase tracking-wide text-brand-blue-dark">
              Profil (projection anonymisée)
            </legend>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Référence anonyme">
                <input
                  name="referenceAnonyme"
                  defaultValue={consultant.referenceAnonyme}
                  required
                  className="input font-mono"
                />
              </Field>
              <Field label="Intitulé de poste">
                <input name="intitulePoste" defaultValue={consultant.intitulePoste ?? ""} className="input" />
              </Field>
              <Field label="Séniorité">
                <select name="seniorityId" defaultValue={consultant.seniorityId ?? ""} className="input">
                  <option value="">—</option>
                  {referentials.seniorites.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Expérience min (ans)">
                  <input
                    name="anneesExperienceMin"
                    type="number"
                    defaultValue={consultant.anneesExperienceMin ?? ""}
                    className="input"
                  />
                </Field>
                <Field label="Expérience max (ans)">
                  <input
                    name="anneesExperienceMax"
                    type="number"
                    defaultValue={consultant.anneesExperienceMax ?? ""}
                    className="input"
                  />
                </Field>
              </div>
            </div>
            <Field label="Résumé de contexte (sans info identifiante — utilisé dans le DC)">
              <textarea
                name="resumeContexte"
                defaultValue={consultant.resumeContexte ?? ""}
                rows={3}
                className="input"
              />
            </Field>
            <Field label="Langues (niveau 1 à 5, détail optionnel)">
              <LangueNiveauGroup
                options={referentials.langues}
                existing={consultant.langues.map((l) => ({
                  langueId: l.langueId,
                  niveau: l.niveau,
                  detail: l.detail,
                }))}
              />
            </Field>
          </fieldset>

          <fieldset className="card p-5 space-y-4">
            <legend className="px-1 text-sm font-semibold uppercase tracking-wide text-brand-blue-dark">
              Suivi interne (jamais exposé)
            </legend>
            <div className="grid grid-cols-2 gap-3">
              <Field label="TJM min (€)">
                <input name="tjmMin" type="number" defaultValue={consultant.tjmMin ?? ""} className="input" />
              </Field>
              <Field label="TJM max (€)">
                <input name="tjmMax" type="number" defaultValue={consultant.tjmMax ?? ""} className="input" />
              </Field>
              <Field label="Statut candidat interne">
                <select
                  name="statutCandidatInterne"
                  defaultValue={consultant.statutCandidatInterne}
                  className="input"
                >
                  {Object.entries(STATUT_CANDIDAT_INTERNE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </Field>
              {canReassignReferent && (
                <Field label="Business manager référent">
                  <select name="businessManagerId" defaultValue={consultant.businessManagerId} className="input">
                    {referentials.bms.map((bm) => (
                      <option key={bm.id} value={bm.id}>
                        {bm.name}
                      </option>
                    ))}
                  </select>
                </Field>
              )}
            </div>

            <div className="grid gap-4 border-t border-slate-100 pt-3 sm:grid-cols-2">
              <p className="col-span-2 -mb-2 text-xs font-medium text-brand-blue-dark">
                Coût / marge — utilisé pour calculer la marge du centre de profit
              </p>
              <NatureContratFields
                defaultNatureContrat={consultant.natureContrat ?? ""}
                defaultSalaireBrutAnnuel={consultant.salaireBrutAnnuel ?? ""}
                defaultTjmAchat={consultant.tjmAchat ?? ""}
                defaultFraisAnnuels={consultant.fraisAnnuels ?? ""}
              />
            </div>

            <Field label="Notes d'entretien">
              <textarea
                name="notesEntretien"
                defaultValue={consultant.notesEntretien ?? ""}
                rows={3}
                className="input"
              />
            </Field>

            <div className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-3">
              <label className="flex items-center gap-2 text-sm text-brand-body">
                <input
                  type="checkbox"
                  name="consentementRgpd"
                  defaultChecked={consultant.consentementRgpd}
                  className="h-4 w-4 rounded border-slate-300 text-brand-blue focus:ring-brand-blue"
                />
                Consentement RGPD (vivier interne)
              </label>
              <label className="flex items-center gap-2 text-sm text-brand-body">
                <input
                  type="checkbox"
                  name="consentementPublication"
                  defaultChecked={consultant.consentementPublication}
                  className="h-4 w-4 rounded border-slate-300 text-brand-blue focus:ring-brand-blue"
                />
                Consentement pour publication anonymisée
              </label>
              <Field label="Durée de conservation (mois)">
                <input
                  name="dureeConservationMois"
                  type="number"
                  defaultValue={consultant.dureeConservationMois}
                  className="input"
                />
              </Field>
              <div className="text-xs text-brand-gray self-end pb-1.5">
                Collecté le {fmtDate(consultant.dateCollecte)} · purge prévue le{" "}
                {fmtDate(consultant.dateConservationLimite)}
              </div>
            </div>
          </fieldset>
        </div>

        {/* --- Compétences ------------------------------------------------ */}
        <div hidden={tab !== "competences"} className="space-y-4">
          <CategorieBlock
            title="IT"
            groups={[
              { label: "Expertises / domaines", name: "expertiseIds", items: expertisesSplit.it, selected: expertiseIdsSelected },
              { label: "Compétences / technologies", name: "competenceIds", items: competencesSplit.it, selected: competenceIdsSelected },
            ]}
          />
          <CategorieBlock
            title="Industrie"
            groups={[
              { label: "Expertises / domaines", name: "expertiseIds", items: expertisesSplit.industrie, selected: expertiseIdsSelected },
              { label: "Compétences / technologies", name: "competenceIds", items: competencesSplit.industrie, selected: competenceIdsSelected },
            ]}
          />
          {(expertisesSplit.nonClasse.length > 0 || competencesSplit.nonClasse.length > 0) && (
            <CategorieBlock
              title="Non classées"
              subtitle="À catégoriser IT / Industrie depuis /admin/referentiels."
              groups={[
                { label: "Expertises / domaines", name: "expertiseIds", items: expertisesSplit.nonClasse, selected: expertiseIdsSelected },
                { label: "Compétences / technologies", name: "competenceIds", items: competencesSplit.nonClasse, selected: competenceIdsSelected },
              ]}
            />
          )}
        </div>

        {/* --- Secteurs ---------------------------------------------------- */}
        <div hidden={tab !== "secteurs"} className="space-y-4">
          <CategorieBlock
            title="IT"
            groups={[{ label: "Secteurs", name: "secteurIds", items: secteursSplit.it, selected: secteurIdsSelected }]}
          />
          <CategorieBlock
            title="Industrie"
            groups={[{ label: "Secteurs", name: "secteurIds", items: secteursSplit.industrie, selected: secteurIdsSelected }]}
          />
          {secteursSplit.nonClasse.length > 0 && (
            <CategorieBlock
              title="Non classés"
              subtitle="À catégoriser IT / Industrie depuis /admin/referentiels."
              groups={[{ label: "Secteurs", name: "secteurIds", items: secteursSplit.nonClasse, selected: secteurIdsSelected }]}
            />
          )}
        </div>

        {/* --- Pièces jointes ---------------------------------------------- */}
        <div hidden={tab !== "pieces"} className="space-y-4">
          <div className="card p-5 space-y-2">
            <h3 className="text-sm font-semibold text-brand-ink">CV</h3>
            <Field label={consultant.cvFileUrl ? "Remplacer le CV" : "CV"}>
              <input
                type="file"
                name="cvFile"
                accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                className="block w-full rounded-lg border border-dashed border-brand-blue-light/60 bg-brand-blue-bg-soft/40 px-3 py-3 text-xs text-brand-gray transition-colors hover:border-brand-blue file:mr-3 file:rounded-md file:border-0 file:bg-brand-blue file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-white"
              />
            </Field>
            {consultant.cvFileUrl && (
              <p className="text-xs text-brand-gray">
                CV actuel :{" "}
                <a
                  href={`/admin/consultants/${consultant.id}/cv`}
                  className="font-medium text-brand-blue hover:underline"
                >
                  {consultant.cvFileNomOriginal || "télécharger"}
                </a>
                . Choisissez un fichier ci-dessus pour le remplacer (nécessite d&apos;enregistrer).
              </p>
            )}
          </div>

          <div className="card p-5 space-y-2">
            <h3 className="text-sm font-semibold text-brand-ink">DC — format HYPERION</h3>
            <a href={`/admin/consultants/${consultant.id}/export-word`} className="btn btn-accent">
              Télécharger le DC (Word)
            </a>
            <p className="text-xs text-brand-gray">
              Généré à partir des données du dossier (profil, compétences, formations, expériences).
            </p>
          </div>
        </div>

        <datalist id="villes-france">
          {VILLES_FRANCE.map((v) => (
            <option key={v.nom} value={v.nom} />
          ))}
        </datalist>

        <button type="submit" className="btn btn-primary px-6 py-2.5">
          Enregistrer les modifications
        </button>
      </form>

      {/* Formulaire séparé (action différente) : régénère le contenu du DC
          depuis le CV + un transcript optionnel, via IA — remplace la saisie
          manuelle des blocs "gabarit" (compétences détaillées / formations /
          expériences), désormais générés plutôt que ressaisis à la main. */}
      <div hidden={tab !== "pieces"} className="card p-5 space-y-3">
        <h3 className="text-sm font-semibold text-brand-ink">
          Générer / régénérer le DC depuis le CV (IA)
        </h3>
        <p className="text-xs text-brand-gray">
          Relit le CV déjà enregistré (ou celui déposé ci-dessous) et, si
          fournie, une transcription d&apos;entretien, pour reconstruire le
          profil, les compétences, formations et expériences détaillées.
          Écrase le contenu précédemment généré/saisi pour ces sections.
        </p>
        <form action={regenerateDcFromIaAction} className="space-y-3">
          <input type="hidden" name="id" value={consultant.id} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Remplacer le CV utilisé (optionnel)">
              <input
                type="file"
                name="cvFile"
                accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                className="block w-full rounded-lg border border-dashed border-brand-blue-light/60 bg-brand-blue-bg-soft/40 px-3 py-2.5 text-xs text-brand-gray transition-colors hover:border-brand-blue file:mr-3 file:rounded-md file:border-0 file:bg-brand-blue file:px-3 file:py-1 file:text-xs file:font-medium file:text-white"
              />
            </Field>
            <Field label="Transcription d'entretien (optionnel)">
              <input
                type="file"
                name="transcriptFile"
                accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                className="block w-full rounded-lg border border-dashed border-brand-blue-light/60 bg-brand-blue-bg-soft/40 px-3 py-2.5 text-xs text-brand-gray transition-colors hover:border-brand-blue file:mr-3 file:rounded-md file:border-0 file:bg-brand-blue file:px-3 file:py-1 file:text-xs file:font-medium file:text-white"
              />
            </Field>
          </div>
          <button type="submit" className="btn btn-secondary">
            Générer le DC
          </button>
        </form>
      </div>
    </div>
  );
}

function CategorieBlock({
  title,
  subtitle,
  groups,
}: {
  title: string;
  subtitle?: string;
  groups: { label: string; name: string; items: Referential[]; selected: Set<string> }[];
}) {
  return (
    <fieldset className="card p-5 space-y-3">
      <legend className="px-1 text-sm font-semibold uppercase tracking-wide text-brand-blue-dark">
        {title}
      </legend>
      {subtitle && <p className="-mt-1 text-xs text-brand-gray">{subtitle}</p>}
      {groups.map((g) => (
        <Field key={g.name} label={g.label}>
          <CheckboxGroup name={g.name} options={g.items} selectedIds={g.selected} />
        </Field>
      ))}
    </fieldset>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-brand-body mb-1">{label}</span>
      {children}
    </label>
  );
}
