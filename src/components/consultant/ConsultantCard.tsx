import Link from "next/link";
import type { ConsultantPublic } from "@/lib/consultant-view";
import { DisponibiliteBadge, Tag } from "./badges";
import ContactRequestButton from "./ContactRequestButton";

export default function ConsultantCard({
  consultant,
  href,
  canContact,
}: {
  consultant: ConsultantPublic;
  href: string;
  canContact: boolean;
}) {
  const mobilites = consultant.typesMobilite.map((m) => m.typeMobilite.label);
  const secteurs = consultant.secteurs.map((s) => s.secteur.label);
  const competencesTriees = [...consultant.competences].sort(
    (a, b) => Number(b.estCle) - Number(a.estCle)
  );
  const anneesLabel = consultant.anneesExperience != null ? `${consultant.anneesExperience} ans` : null;

  return (
    <div className="card card-hover relative overflow-hidden p-4">
      <span className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-brand-blue to-brand-green" aria-hidden />
      <Link href={href} className="block pl-1.5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="text-xs font-mono text-brand-gray">
              {consultant.referenceAnonyme}
            </div>
            <h3 className="text-base font-semibold text-brand-ink">
              {consultant.intitulePoste ?? "Poste non renseigné"}
            </h3>
          </div>
          <DisponibiliteBadge value={consultant.disponibilite} />
        </div>

        <div className="mt-1.5 text-sm text-brand-gray">
          {consultant.seniority?.label}
          {anneesLabel ? ` · ${anneesLabel}` : ""}
          {mobilites.length > 0 ? ` · ${mobilites.join(", ")}` : ""}
        </div>

        {consultant.resumeContexte && (
          <p className="mt-2 line-clamp-2 text-sm text-brand-body">
            {consultant.resumeContexte}
          </p>
        )}

        <div className="mt-3 flex flex-wrap gap-1.5">
          {secteurs.map((s) => (
            <Tag key={s}>{s}</Tag>
          ))}
          {competencesTriees.slice(0, 5).map((c) => (
            <Tag key={c.competence.id}>{c.competence.label}</Tag>
          ))}
        </div>
      </Link>

      <div className="mt-3 flex items-center gap-3 border-t border-slate-100 pl-1.5 pt-3">
        <Link href={href} className="link-underline text-sm text-brand-gray hover:text-brand-ink">
          Voir la fiche complète
        </Link>
        {canContact && (
          <ContactRequestButton
            consultantId={consultant.id}
            reference={consultant.referenceAnonyme}
            compact
          />
        )}
      </div>
    </div>
  );
}
