import type { ConsultantPublic } from "@/lib/consultant-view";
import { DisponibiliteBadge, NiveauDots, Tag, TypeContratBadge } from "./badges";
import { COMPETENCE_CATEGORIE_LABELS, NIVEAU_LABELS } from "@/lib/constants";
import { formatDuree, formatMoisAnnee } from "@/lib/experience-format";

export default function ConsultantDetail({
  consultant,
}: {
  consultant: ConsultantPublic;
}) {
  const mobilites = consultant.typesMobilite.map((m) => m.typeMobilite.label);
  const secteurs = consultant.secteurs.map((s) => s.secteur.label);
  const expertises = consultant.expertises.map((e) => e.expertise.label);
  const zones = consultant.zonesGeographiques.map((z) => z.zoneGeographique.label);
  const competencesCles = consultant.competences.filter((c) => c.estCle);
  const anneesLabel =
    consultant.anneesExperienceMin != null
      ? consultant.anneesExperienceMax != null &&
        consultant.anneesExperienceMax !== consultant.anneesExperienceMin
        ? `${consultant.anneesExperienceMin}–${consultant.anneesExperienceMax} ans d'expérience`
        : `${consultant.anneesExperienceMin}+ ans d'expérience`
      : null;

  return (
    <div className="space-y-8">
      {/* En-tête façon gabarit HYPERION */}
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

      {consultant.resumeContexte && (
        <section>
          <p className="text-sm leading-6 text-brand-body whitespace-pre-line">
            {consultant.resumeContexte}
          </p>
        </section>
      )}

      {consultant.experiences.length > 0 && (
        <section>
          <SectionTitle n="01" title="Expériences clés" />
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {consultant.experiences.slice(0, 3).map((exp) => (
              <div
                key={exp.id}
                className="card-hover rounded-lg border border-brand-blue-light/25 bg-brand-blue-bg-soft p-3"
              >
                <div className="text-xs font-medium text-brand-blue-dark">
                  {formatMoisAnnee(exp.dateDebut)}
                </div>
                <div className="text-sm font-medium text-brand-ink">{exp.missionTitre}</div>
                <div className="text-xs text-brand-gray">{exp.entreprise}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {(expertises.length > 0 || consultant.competenceCategories.length > 0) && (
        <section>
          <SectionTitle n="02" title="Compétences" />
          <div className="mt-3 space-y-2">
            {consultant.competenceCategories.map((c) => (
              <div key={c.id} className="flex items-start justify-between gap-3 border-b border-slate-100 pb-2 text-sm">
                <div>
                  <div className="font-medium text-brand-ink">
                    {COMPETENCE_CATEGORIE_LABELS[
                      c.categorie as keyof typeof COMPETENCE_CATEGORIE_LABELS
                    ] ?? c.categorie}
                  </div>
                  <div className="text-brand-body">{c.contenu}</div>
                </div>
                <NiveauDots niveau={c.niveau} label={NIVEAU_LABELS[c.niveau]} />
              </div>
            ))}
          </div>
          {(expertises.length > 0 || secteurs.length > 0) && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {expertises.map((e) => (
                <Tag key={e}>{e}</Tag>
              ))}
              {secteurs.map((s) => (
                <Tag key={s}>{s}</Tag>
              ))}
            </div>
          )}
          {consultant.competences.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {consultant.competences.map((c) => (
                <Tag key={c.competence.id}>{c.competence.label}</Tag>
              ))}
            </div>
          )}
        </section>
      )}

      {consultant.formations.length > 0 && (
        <section>
          <SectionTitle n="03" title="Formations & certifications" />
          <ul className="mt-3 space-y-1.5 text-sm">
            {consultant.formations.map((f) => (
              <li key={f.id} className="flex gap-3">
                <span className="w-14 shrink-0 text-brand-gray">{f.annee}</span>
                <span className="text-brand-body">
                  {f.intitule}
                  {f.etablissement ? ` — ${f.etablissement}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {consultant.langues.length > 0 && (
        <section>
          <SectionTitle n="04" title="Langues" />
          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
            {consultant.langues.map((l) => (
              <div key={l.langue.id} className="text-sm">
                <div className="font-medium text-brand-ink">{l.langue.label}</div>
                <NiveauDots niveau={l.niveau} label={l.detail ?? NIVEAU_LABELS[l.niveau]} />
              </div>
            ))}
          </div>
        </section>
      )}

      {consultant.experiences.length > 0 && (
        <section>
          <SectionTitle n="05" title="Expériences détaillées" />
          <div className="mt-3 space-y-5">
            {consultant.experiences.map((exp) => (
              <div key={exp.id} className="border-b border-slate-100 pb-4 last:border-0">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                  <div className="text-sm font-semibold text-brand-ink">
                    {exp.entreprise} — {formatMoisAnnee(exp.dateDebut)} à{" "}
                    {formatMoisAnnee(exp.dateFin)}
                  </div>
                  <div className="text-xs text-brand-blue-light font-medium">
                    {formatDuree(exp.dateDebut, exp.dateFin)}
                  </div>
                </div>
                {exp.secteurActivite && (
                  <div className="mt-1 text-sm text-brand-body">
                    Secteur : {exp.secteurActivite}
                  </div>
                )}
                <div className="text-sm text-brand-body">Mission : {exp.missionTitre}</div>
                {exp.contexteObjectif && (
                  <div className="mt-1 text-sm text-brand-body">
                    Contexte &amp; objectif : {exp.contexteObjectif}
                  </div>
                )}
                {exp.realisations && (
                  <div className="mt-2">
                    <div className="text-xs font-semibold text-brand-blue">Réalisations</div>
                    <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-brand-body">
                      {exp.realisations.split("\n").filter(Boolean).map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {exp.environnementTechnique && (
                  <div className="mt-2 text-sm text-brand-body">
                    Environnement technique : {exp.environnementTechnique}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {mobilites.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-brand-ink mb-1.5">Mobilité</h2>
          <div className="flex flex-wrap gap-1.5 mb-1.5">
            {mobilites.map((m) => (
              <Tag key={m}>{m}</Tag>
            ))}
          </div>
          <p className="text-sm text-brand-body">
            {zones.length > 0 && `Zones : ${zones.join(", ")}. `}
            {consultant.villeRattachementZoneLarge &&
              `Rattachement : ${consultant.villeRattachementZoneLarge}. `}
            {consultant.rayonKm && `Rayon accepté : jusqu'à ${consultant.rayonKm} km. `}
            {consultant.ouvertGrandDeplacement &&
              "Ouvert aux déplacements avec découchés."}
          </p>
        </section>
      )}

      <p className="text-xs text-brand-gray border-t border-slate-200 pt-3">
        La disponibilité affichée est indicative ; elle est confirmée par
        votre business manager au moment du contact.
      </p>
    </div>
  );
}

function SectionTitle({ n, title }: { n: string; title: string }) {
  return (
    <div className="section-title">
      <span className="n">{n}</span>
      <span>—</span>
      <span>{title}</span>
    </div>
  );
}
