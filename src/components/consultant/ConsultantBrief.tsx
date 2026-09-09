import type { ConsultantPublic } from "@/lib/consultant-view";
import { DisponibiliteBadge, Tag, TypeContratBadge } from "./badges";

export default function ConsultantBrief({
  consultant,
}: {
  consultant: ConsultantPublic;
}) {
  const secteurs = consultant.secteurs.map((s) => s.secteur.label);
  const expertises = consultant.expertises.map((e) => e.expertise.label);
  const zones = consultant.zonesGeographiques.map((z) => z.zoneGeographique.label);
  const competencesCles = consultant.competences.filter((c) => c.estCle);
  const anneesLabel =
    consultant.anneesExperience != null ? `${consultant.anneesExperience} ans d'expérience` : null;
  const presentation = consultant.presentationCourte || consultant.resumeContexte;

  return (
    <div className="space-y-6">
      <div className="topbar-gradient relative overflow-hidden rounded-2xl px-5 py-5 sm:px-7 sm:py-6">
        <div
          className="pointer-events-none absolute -right-10 -top-16 h-48 w-48 rounded-full bg-white/10 blur-2xl"
          aria-hidden
        />
        <div className="relative text-xs font-mono uppercase tracking-wide text-white/60">
          {consultant.referenceAnonyme}
        </div>
        <h1 className="relative text-xl font-semibold text-white sm:text-2xl">
          {consultant.intitulePoste ?? "Poste non renseigné"}
        </h1>
        <div className="relative mt-1 text-sm text-white/80">
          {consultant.seniority?.label}
          {anneesLabel ? ` · ${anneesLabel}` : ""}
        </div>
        <div className="relative mt-3 flex flex-wrap gap-2">
          <DisponibiliteBadge value={consultant.disponibilite} />
          <TypeContratBadge value={consultant.typeContrat} light />
          {competencesCles.map((c) => (
            <Tag key={c.competence.id} light>
              {c.competence.label}
            </Tag>
          ))}
        </div>
      </div>

      {presentation && (
        <p className="text-sm leading-6 text-brand-body whitespace-pre-line">{presentation}</p>
      )}

      {(expertises.length > 0 || secteurs.length > 0) && (
        <div className="flex flex-wrap gap-1.5">
          {expertises.map((e) => (
            <Tag key={e}>{e}</Tag>
          ))}
          {secteurs.map((s) => (
            <Tag key={s}>{s}</Tag>
          ))}
        </div>
      )}

      {(zones.length > 0 || consultant.villeRattachement) && (
        <p className="text-sm text-brand-body">
          <span className="font-medium text-brand-ink">Mobilité : </span>
          {zones.length > 0 && `${zones.join(", ")}. `}
          {consultant.villeRattachement && `Rattachement : ${consultant.villeRattachement}. `}
          {consultant.rayonKm && `Rayon accepté : jusqu'à ${consultant.rayonKm} km. `}
          {consultant.ouvertGrandDeplacement && "Ouvert aux déplacements avec découchés."}
        </p>
      )}

      <a
        href={`/bibliotheque/dossiers/${consultant.referenceAnonyme}/dc`}
        className="btn btn-accent"
      >
        Télécharger le DC (Word)
      </a>

      <p className="text-xs text-brand-gray border-t border-slate-200 pt-3">
        La disponibilité affichée est indicative ; elle est confirmée par
        votre business manager au moment du contact.
      </p>
    </div>
  );
}
