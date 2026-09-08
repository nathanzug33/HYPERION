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
import {
  COMPETENCE_CATEGORIES,
  COMPETENCE_CATEGORIE_LABELS,
  DISPONIBILITE_LABELS,
  FORMATION_TYPE,
  NIVEAU_LABELS,
  STATUT_CANDIDAT_INTERNE_LABELS,
  TYPE_CONTRAT_LABELS,
} from "@/lib/constants";
import { updateConsultantAction } from "../actions";
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

const FORMATION_SLOTS = 6;
const EXPERIENCE_SLOTS = 4;

type Referential = { id: string; label: string };

export default function ConsultantEditForm({
  consultant,
  referentials,
  isAdmin,
}: {
  consultant: ConsultantWithRelations;
  referentials: {
    secteurs: Referential[];
    expertises: Referential[];
    seniorites: Referential[];
    typesMobilite: Referential[];
    zones: Referential[];
    competences: Referential[];
    langues: Referential[];
    bms: User[];
  };
  isAdmin: boolean;
}) {
  const fmtDate = (d: Date | null) =>
    d ? new Date(d).toISOString().slice(0, 10) : "";

  return (
    <form action={updateConsultantAction} className="space-y-8">
      <input type="hidden" name="id" value={consultant.id} />

      <fieldset className="card p-5 space-y-4">
        <legend className="px-1 text-sm font-semibold uppercase tracking-wide text-brand-blue-dark">
          Champs internes (jamais exposés)
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
          {isAdmin && (
            <Field label="Business manager référent">
              <select
                name="businessManagerId"
                defaultValue={consultant.businessManagerId}
                className="input"
              >
                {referentials.bms.map((bm) => (
                  <option key={bm.id} value={bm.id}>
                    {bm.name}
                  </option>
                ))}
              </select>
            </Field>
          )}
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

      <fieldset className="card p-5 space-y-4">
        <legend className="px-1 text-sm font-semibold uppercase tracking-wide text-brand-blue-dark">
          Champs exposables (projection anonymisée)
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
            <input
              name="intitulePoste"
              defaultValue={consultant.intitulePoste ?? ""}
              className="input"
            />
          </Field>
          <Field label="Séniorité">
            <select
              name="seniorityId"
              defaultValue={consultant.seniorityId ?? ""}
              className="input"
            >
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
          <Field label="Disponibilité">
            <select
              name="disponibilite"
              defaultValue={consultant.disponibilite ?? ""}
              className="input"
            >
              <option value="">—</option>
              {Object.entries(DISPONIBILITE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Type de contrat envisageable">
            <select
              name="typeContrat"
              defaultValue={consultant.typeContrat ?? ""}
              className="input"
            >
              <option value="">—</option>
              {Object.entries(TYPE_CONTRAT_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="Résumé de contexte de mission (sans info identifiante)">
          <textarea
            name="resumeContexte"
            defaultValue={consultant.resumeContexte ?? ""}
            rows={3}
            className="input"
          />
        </Field>

        <Field label="Secteurs">
          <CheckboxGroup
            name="secteurIds"
            options={referentials.secteurs}
            selectedIds={new Set(consultant.secteurs.map((s) => s.secteurId))}
          />
        </Field>

        <Field label="Expertise / domaine">
          <CheckboxGroup
            name="expertiseIds"
            options={referentials.expertises}
            selectedIds={new Set(consultant.expertises.map((e) => e.expertiseId))}
          />
        </Field>

        <Field label="Compétences / technologies">
          <CheckboxGroup
            name="competenceIds"
            options={referentials.competences}
            selectedIds={new Set(consultant.competences.map((c) => c.competenceId))}
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

        <div className="border-t border-slate-100 pt-4">
          <h3 className="text-sm font-medium text-brand-ink mb-2">
            Mobilité (critère éliminatoire — à renseigner avec soin)
          </h3>
          <div className="space-y-3">
            <Field label="Type(s) de mobilité">
              <CheckboxGroup
                name="typeMobiliteIds"
                options={referentials.typesMobilite}
                selectedIds={new Set(consultant.typesMobilite.map((m) => m.typeMobiliteId))}
              />
            </Field>
            <Field label="Zone(s) géographique(s) de préférence">
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
                <p className="mt-1 text-xs text-brand-gray">
                  Reconnue automatiquement dans le référentiel de villes pour
                  activer la recherche « ville + rayon » côté client.
                </p>
              </Field>
              <Field label="Rayon accepté (km)">
                <input
                  name="rayonKm"
                  type="number"
                  defaultValue={consultant.rayonKm ?? ""}
                  className="input"
                />
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
          </div>
        </div>
      </fieldset>

      <fieldset className="card p-5 space-y-3">
        <legend className="px-1 text-sm font-semibold uppercase tracking-wide text-brand-blue-dark">
          Compétences détaillées (gabarit HYPERION — 02)
        </legend>
        {Object.values(COMPETENCE_CATEGORIES).map((cat) => {
          const existing = consultant.competenceCategories.find((c) => c.categorie === cat);
          return (
            <div key={cat} className="grid grid-cols-[10rem_1fr_8rem] items-center gap-2">
              <span className="text-xs font-medium text-brand-body">
                {COMPETENCE_CATEGORIE_LABELS[cat]}
              </span>
              <input
                name={`compCat_${cat}_contenu`}
                defaultValue={existing?.contenu ?? ""}
                placeholder="Ex. conception mécanique, calcul…"
                className="input"
              />
              <select
                name={`compCat_${cat}_niveau`}
                defaultValue={existing?.niveau ?? 3}
                className="input"
              >
                {Object.entries(NIVEAU_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
          );
        })}
      </fieldset>

      <fieldset className="card p-5 space-y-3">
        <legend className="px-1 text-sm font-semibold uppercase tracking-wide text-brand-blue-dark">
          Formations & certifications (gabarit HYPERION — 03)
        </legend>
        <p className="text-xs text-brand-gray">
          Laissez un bloc vide (intitulé) pour qu&apos;il soit ignoré à l&apos;enregistrement.
        </p>
        {Array.from({ length: FORMATION_SLOTS }).map((_, i) => {
          const existing = consultant.formations[i];
          return (
            <div key={i} className="grid grid-cols-[7rem_7rem_1fr_1fr] gap-2">
              <select name={`formationType_${i}`} defaultValue={existing?.type ?? FORMATION_TYPE.FORMATION} className="input">
                <option value={FORMATION_TYPE.FORMATION}>Formation</option>
                <option value={FORMATION_TYPE.CERTIFICATION}>Certification</option>
              </select>
              <input name={`formationAnnee_${i}`} defaultValue={existing?.annee ?? ""} placeholder="Année" className="input" />
              <input name={`formationIntitule_${i}`} defaultValue={existing?.intitule ?? ""} placeholder="Intitulé" className="input" />
              <input name={`formationEtablissement_${i}`} defaultValue={existing?.etablissement ?? ""} placeholder="Établissement" className="input" />
            </div>
          );
        })}
      </fieldset>

      <fieldset className="card p-5 space-y-6">
        <legend className="px-1 text-sm font-semibold uppercase tracking-wide text-brand-blue-dark">
          Expériences détaillées (gabarit HYPERION — 05)
        </legend>
        <p className="text-xs text-brand-gray">
          De la plus récente à la plus ancienne. {EXPERIENCE_SLOTS} blocs sont
          prévus ; laissez un bloc vide (entreprise + mission) pour
          qu&apos;il soit ignoré à l&apos;enregistrement. Une réalisation par
          ligne.
        </p>
        {Array.from({ length: EXPERIENCE_SLOTS }).map((_, i) => {
          const existing = consultant.experiences[i];
          const toMonthInput = (d: Date | null | undefined) =>
            d ? new Date(d).toISOString().slice(0, 7) : "";
          return (
            <div key={i} className="space-y-2 border-t border-slate-100 pt-4 first:border-0 first:pt-0">
              <div className="grid grid-cols-2 gap-2">
                <input name={`expEntreprise_${i}`} defaultValue={existing?.entreprise ?? ""} placeholder="Entreprise (générique si NDA)" className="input" />
                <input name={`expSecteur_${i}`} defaultValue={existing?.secteurActivite ?? ""} placeholder="Secteur d'activité" className="input" />
              </div>
              <input name={`expMission_${i}`} defaultValue={existing?.missionTitre ?? ""} placeholder="Intitulé de la mission" className="input" />
              <div className="grid grid-cols-2 gap-2">
                <Field label="Début">
                  <input type="month" name={`expDebut_${i}`} defaultValue={toMonthInput(existing?.dateDebut)} className="input" />
                </Field>
                <Field label="Fin (vide = en cours)">
                  <input type="month" name={`expFin_${i}`} defaultValue={toMonthInput(existing?.dateFin)} className="input" />
                </Field>
              </div>
              <textarea name={`expContexte_${i}`} defaultValue={existing?.contexteObjectif ?? ""} placeholder="Contexte & objectif" rows={2} className="input" />
              <textarea
                name={`expRealisations_${i}`}
                defaultValue={existing?.realisations ?? ""}
                placeholder={"Réalisations (une par ligne)"}
                rows={3}
                className="input"
              />
              <input name={`expEnvTech_${i}`} defaultValue={existing?.environnementTechnique ?? ""} placeholder="Environnement technique" className="input" />
            </div>
          );
        })}
      </fieldset>

      <datalist id="villes-france">
        {VILLES_FRANCE.map((v) => (
          <option key={v.nom} value={v.nom} />
        ))}
      </datalist>

      <button
        type="submit"
        className="btn btn-primary px-6 py-2.5"
      >
        Enregistrer les modifications
      </button>
    </form>
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
