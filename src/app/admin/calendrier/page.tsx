import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/guards";
import { consultantVisibilityWhere } from "@/lib/consultant-access";
import { entrepriseVisibilityWhere } from "@/lib/crm-access";

export const dynamic = "force-dynamic";

const JOURS_SEMAINE = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const MOIS_LABELS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

type CalEvent = {
  id: string;
  titre: string;
  type: string;
  fait: boolean;
  date: Date;
  href: string;
  label: string;
  domaine: "ATS" | "CRM";
};

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default async function CalendrierPage({
  searchParams,
}: {
  searchParams: Promise<{ annee?: string; mois?: string }>;
}) {
  const session = await requireStaff();
  const sp = await searchParams;

  const now = new Date();
  const annee = Number(sp.annee) || now.getFullYear();
  const mois = sp.mois ? Number(sp.mois) - 1 : now.getMonth(); // 0-indexé

  const debutMois = new Date(annee, mois, 1);
  const finMois = new Date(annee, mois + 1, 0, 23, 59, 59, 999);

  // Grille : du lundi précédant le 1er au dimanche suivant le dernier jour.
  const premierJourSemaine = (debutMois.getDay() + 6) % 7; // 0 = lundi
  const debutGrille = new Date(debutMois);
  debutGrille.setDate(debutMois.getDate() - premierJourSemaine);
  const dernierJourSemaine = (finMois.getDay() + 6) % 7;
  const finGrille = new Date(finMois);
  finGrille.setDate(finMois.getDate() + (6 - dernierJourSemaine));

  const bmFilter = consultantVisibilityWhere(session.user);
  const entrepriseFilter = entrepriseVisibilityWhere(session.user);

  const [suivisAts, suivisCrm] = await Promise.all([
    prisma.suiviCandidat.findMany({
      where: {
        type: { in: ["RDV", "RAPPEL"] },
        dateProgrammee: { gte: debutGrille, lte: finGrille },
        consultant: bmFilter,
      },
      include: { consultant: { select: { id: true, referenceAnonyme: true } } },
    }),
    prisma.suiviCommercial.findMany({
      where: {
        type: { in: ["RDV", "RAPPEL"] },
        dateProgrammee: { gte: debutGrille, lte: finGrille },
        entreprise: entrepriseFilter,
      },
      include: {
        entreprise: { select: { id: true, nom: true } },
        contact: { select: { id: true, prenom: true, nom: true } },
      },
    }),
  ]);

  const events: CalEvent[] = [
    ...suivisAts.map((s) => ({
      id: `ats-${s.id}`,
      titre: s.titre,
      type: s.type,
      fait: s.fait,
      date: s.dateProgrammee!,
      href: `/admin/consultants/${s.consultant.id}`,
      label: `${s.consultant.referenceAnonyme} — ${s.titre}`,
      domaine: "ATS" as const,
    })),
    ...suivisCrm.map((s) => ({
      id: `crm-${s.id}`,
      titre: s.titre,
      type: s.type,
      fait: s.fait,
      date: s.dateProgrammee!,
      href: s.contact
        ? `/admin/crm/${s.entreprise.id}/contacts/${s.contact.id}`
        : `/admin/crm/${s.entreprise.id}`,
      label: `${s.entreprise.nom}${s.contact ? ` (${s.contact.prenom} ${s.contact.nom})` : ""} — ${s.titre}`,
      domaine: "CRM" as const,
    })),
  ].sort((a, b) => a.date.getTime() - b.date.getTime());

  const eventsByDay = new Map<string, CalEvent[]>();
  for (const e of events) {
    const key = toDateKey(e.date);
    if (!eventsByDay.has(key)) eventsByDay.set(key, []);
    eventsByDay.get(key)!.push(e);
  }

  const jours: Date[] = [];
  for (let d = new Date(debutGrille); d <= finGrille; d.setDate(d.getDate() + 1)) {
    jours.push(new Date(d));
  }

  const anneePrecedente = mois === 0 ? annee - 1 : annee;
  const moisPrecedentReel = mois === 0 ? 12 : mois;
  const moisSuivant = mois === 11 ? { annee: annee + 1, mois: 1 } : { annee, mois: mois + 2 };

  const today = toDateKey(now);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-brand-ink">Calendrier</h1>
          <p className="mt-1 text-sm text-brand-gray">
            RDV et rappels programmés — candidats (ATS) et commercial (CRM).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/admin/calendrier?annee=${anneePrecedente}&mois=${moisPrecedentReel}`}
            className="btn btn-secondary"
          >
            ← Précédent
          </Link>
          <span className="min-w-40 text-center text-sm font-semibold text-brand-ink">
            {MOIS_LABELS[mois]} {annee}
          </span>
          <Link
            href={`/admin/calendrier?annee=${moisSuivant.annee}&mois=${moisSuivant.mois}`}
            className="btn btn-secondary"
          >
            Suivant →
          </Link>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="grid grid-cols-7 border-b border-slate-100 bg-brand-blue-bg-soft text-center text-xs font-semibold uppercase tracking-wide text-brand-gray">
          {JOURS_SEMAINE.map((j) => (
            <div key={j} className="px-2 py-2">
              {j}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {jours.map((jour) => {
            const key = toDateKey(jour);
            const dayEvents = eventsByDay.get(key) ?? [];
            const horsMois = jour.getMonth() !== mois;
            const isToday = key === today;
            return (
              <div
                key={key}
                className={`min-h-[7rem] border-b border-r border-slate-100 p-1.5 last:border-r-0 ${
                  horsMois ? "bg-slate-50/60" : "bg-white"
                }`}
              >
                <div
                  className={`mb-1 inline-flex h-5 w-5 items-center justify-center rounded-full text-xs ${
                    isToday
                      ? "bg-brand-blue font-semibold text-white"
                      : horsMois
                        ? "text-brand-gray/50"
                        : "text-brand-body"
                  }`}
                >
                  {jour.getDate()}
                </div>
                <div className="space-y-0.5">
                  {dayEvents.slice(0, 4).map((e) => (
                    <Link
                      key={e.id}
                      href={e.href}
                      title={e.label}
                      className={`block truncate rounded px-1 py-0.5 text-[10px] font-medium transition-colors ${
                        e.fait
                          ? "bg-slate-100 text-brand-gray line-through"
                          : e.domaine === "ATS"
                            ? "bg-brand-blue-bg text-brand-blue-dark hover:bg-brand-blue/20"
                            : "bg-amber-50 text-amber-700 hover:bg-amber-100"
                      }`}
                    >
                      {new Date(e.date).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}{" "}
                      {e.label}
                    </Link>
                  ))}
                  {dayEvents.length > 4 && (
                    <div className="px-1 text-[10px] text-brand-gray">
                      +{dayEvents.length - 4} de plus
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-xs text-brand-gray">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-brand-blue-bg" aria-hidden /> ATS (candidats)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-amber-50" aria-hidden /> CRM (commercial)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-slate-100" aria-hidden /> Fait
        </span>
      </div>
    </div>
  );
}
