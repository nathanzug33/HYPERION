import type { ConsultantPublic } from "@/lib/consultant-view";
import { DisponibiliteBadge, Tag, TypeContratBadge } from "./badges";

export default function ConsultantDetail({
  consultant,
}: {
  consultant: ConsultantPublic;
}) {
  const mobilites = consultant.typesMobilite.map((m) => m.typeMobilite.label);
  const secteurs = consultant.secteurs.map((s) => s.secteur.label);
  const expertises = consultant.expertises.map((e) => e.expertise.label);
  const zones = consultant.zonesGeographiques.map((z) => z.zoneGeographique.label);
  const langues = consultant.langues.map((l) => l.langue.label);
  const anneesLabel =
    consultant.anneesExperienceMin != null
      ? consultant.anneesExperienceMax != null &&
        consultant.anneesExperienceMax !== consultant.anneesExperienceMin
        ? `${consultant.anneesExperienceMin}–${consultant.anneesExperienceMax} ans d'expérience`
        : `${consultant.anneesExperienceMin}+ ans d'expérience`
      : null;

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs font-mono text-slate-400">
          {consultant.referenceAnonyme}
        </div>
        <h1 className="text-2xl font-semibold text-slate-900">
          {consultant.intitulePoste ?? "Poste non renseigné"}
        </h1>
        <div className="mt-1 text-sm text-slate-500">
          {consultant.seniority?.label}
          {anneesLabel ? ` · ${anneesLabel}` : ""}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <DisponibiliteBadge value={consultant.disponibilite} />
          <TypeContratBadge value={consultant.typeContrat} />
        </div>
      </div>

      {consultant.resumeContexte && (
        <section>
          <h2 className="text-sm font-semibold text-slate-900 mb-1">
            Contexte de mission
          </h2>
          <p className="text-sm leading-6 text-slate-700 whitespace-pre-line">
            {consultant.resumeContexte}
          </p>
        </section>
      )}

      {expertises.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-slate-900 mb-1.5">
            Expertise / domaine
          </h2>
          <div className="flex flex-wrap gap-1.5">
            {expertises.map((e) => (
              <Tag key={e}>{e}</Tag>
            ))}
          </div>
        </section>
      )}

      {secteurs.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-slate-900 mb-1.5">Secteurs</h2>
          <div className="flex flex-wrap gap-1.5">
            {secteurs.map((s) => (
              <Tag key={s}>{s}</Tag>
            ))}
          </div>
        </section>
      )}

      {consultant.competences.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-slate-900 mb-1.5">
            Compétences / technologies
          </h2>
          <div className="flex flex-wrap gap-1.5">
            {consultant.competences.map((c) => (
              <Tag key={c.competence.id}>{c.competence.label}</Tag>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-sm font-semibold text-slate-900 mb-1.5">Mobilité</h2>
        <div className="flex flex-wrap gap-1.5 mb-1.5">
          {mobilites.map((m) => (
            <Tag key={m}>{m}</Tag>
          ))}
        </div>
        <p className="text-sm text-slate-600">
          {zones.length > 0 && `Zones : ${zones.join(", ")}. `}
          {consultant.villeRattachementZoneLarge &&
            `Rattachement : ${consultant.villeRattachementZoneLarge}. `}
          {consultant.rayonKm && `Rayon accepté : jusqu'à ${consultant.rayonKm} km. `}
          {consultant.ouvertGrandDeplacement &&
            "Ouvert aux déplacements avec découchés."}
        </p>
      </section>

      {langues.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-slate-900 mb-1.5">Langues</h2>
          <div className="flex flex-wrap gap-1.5">
            {langues.map((l) => (
              <Tag key={l}>{l}</Tag>
            ))}
          </div>
        </section>
      )}

      <p className="text-xs text-slate-400 border-t border-slate-200 pt-3">
        La disponibilité affichée est indicative ; elle est confirmée par
        votre business manager au moment du contact.
      </p>
    </div>
  );
}
