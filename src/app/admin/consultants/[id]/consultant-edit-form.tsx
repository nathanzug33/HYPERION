import type {
  Consultant,
  ConsultantCompetence,
  ConsultantExpertise,
  ConsultantLangue,
  ConsultantSecteur,
  ConsultantTypeMobilite,
  ConsultantZoneGeographique,
  User,
} from "@prisma/client";
import CheckboxGroup from "@/components/form/CheckboxGroup";
import {
  DISPONIBILITE_LABELS,
  STATUT_CANDIDAT_INTERNE_LABELS,
  TYPE_CONTRAT_LABELS,
} from "@/lib/constants";
import { updateConsultantAction } from "../actions";

type ConsultantWithRelations = Consultant & {
  secteurs: ConsultantSecteur[];
  expertises: ConsultantExpertise[];
  competences: ConsultantCompetence[];
  typesMobilite: ConsultantTypeMobilite[];
  zonesGeographiques: ConsultantZoneGeographique[];
  langues: ConsultantLangue[];
};

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

      <fieldset className="rounded-lg border border-slate-200 bg-white p-4 space-y-4">
        <legend className="px-1 text-sm font-semibold text-slate-900">
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
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              name="consentementRgpd"
              defaultChecked={consultant.consentementRgpd}
              className="rounded border-slate-300"
            />
            Consentement RGPD (vivier interne)
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              name="consentementPublication"
              defaultChecked={consultant.consentementPublication}
              className="rounded border-slate-300"
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
          <div className="text-xs text-slate-500 self-end pb-1.5">
            Collecté le {fmtDate(consultant.dateCollecte)} · purge prévue le{" "}
            {fmtDate(consultant.dateConservationLimite)}
          </div>
        </div>
      </fieldset>

      <fieldset className="rounded-lg border border-slate-200 bg-white p-4 space-y-4">
        <legend className="px-1 text-sm font-semibold text-slate-900">
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

        <Field label="Langues">
          <CheckboxGroup
            name="langueIds"
            options={referentials.langues}
            selectedIds={new Set(consultant.langues.map((l) => l.langueId))}
          />
        </Field>

        <div className="border-t border-slate-100 pt-4">
          <h3 className="text-sm font-medium text-slate-800 mb-2">
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
              <Field label="Ville / zone de rattachement (large, ex. région)">
                <input
                  name="villeRattachementZoneLarge"
                  defaultValue={consultant.villeRattachementZoneLarge ?? ""}
                  className="input"
                />
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
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                name="ouvertGrandDeplacement"
                defaultChecked={consultant.ouvertGrandDeplacement}
                className="rounded border-slate-300"
              />
              Ouvert au grand déplacement (découchés)
            </label>
          </div>
        </div>
      </fieldset>

      <button
        type="submit"
        className="rounded-md bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-700"
      >
        Enregistrer les modifications
      </button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-slate-700 mb-1">{label}</span>
      {children}
    </label>
  );
}
