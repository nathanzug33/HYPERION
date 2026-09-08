import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/guards";
import { consultantVisibilityWhere } from "@/lib/consultant-access";
import {
  STATUT_PUBLICATION_LABELS,
  STATUT_CANDIDAT_INTERNE_LABELS,
} from "@/lib/constants";
import FilterForm from "./filter-form";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

function toArray(v: string | string[] | undefined): string[] {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

export default async function RechercheAvanceePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireStaff();
  const sp = await searchParams;

  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const competence = toArray(sp.competence);
  const expertise = toArray(sp.expertise);
  const secteur = toArray(sp.secteur);
  const mobilite = toArray(sp.mobilite);
  const zone = toArray(sp.zone);
  const seniorite = toArray(sp.seniorite);
  const disponibilite = toArray(sp.disponibilite);
  const statutCandidatInterne = toArray(sp.statutCandidatInterne);

  const where: Prisma.ConsultantWhereInput = {
    AND: [
      consultantVisibilityWhere(session.user),
      competence.length
        ? { competences: { some: { competenceId: { in: competence } } } }
        : {},
      expertise.length
        ? { expertises: { some: { expertiseId: { in: expertise } } } }
        : {},
      secteur.length ? { secteurs: { some: { secteurId: { in: secteur } } } } : {},
      mobilite.length
        ? { typesMobilite: { some: { typeMobiliteId: { in: mobilite } } } }
        : {},
      zone.length
        ? { zonesGeographiques: { some: { zoneGeographiqueId: { in: zone } } } }
        : {},
      seniorite.length ? { seniorityId: { in: seniorite } } : {},
      disponibilite.length ? { disponibilite: { in: disponibilite } } : {},
      statutCandidatInterne.length
        ? { statutCandidatInterne: { in: statutCandidatInterne } }
        : {},
      q
        ? {
            OR: [
              { nom: { contains: q } },
              { prenom: { contains: q } },
              { referenceAnonyme: { contains: q } },
              { intitulePoste: { contains: q } },
              { sourceCvTexte: { contains: q } },
              { notesEntretien: { contains: q } },
              { resumeContexte: { contains: q } },
              { competences: { some: { competence: { label: { contains: q } } } } },
            ],
          }
        : {},
    ],
  };

  const [consultants, competences, expertises, secteurs, typesMobilite, zones, seniorites] =
    await Promise.all([
      prisma.consultant.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        include: { businessManager: true, seniority: true },
      }),
      prisma.competence.findMany({ where: { active: true }, orderBy: { label: "asc" } }),
      prisma.expertise.findMany({ where: { active: true }, orderBy: { ordre: "asc" } }),
      prisma.secteur.findMany({ where: { active: true }, orderBy: { ordre: "asc" } }),
      prisma.typeMobilite.findMany({ where: { active: true }, orderBy: { ordre: "asc" } }),
      prisma.zoneGeographique.findMany({ where: { active: true }, orderBy: { ordre: "asc" } }),
      prisma.seniorite.findMany({ where: { active: true }, orderBy: { ordre: "asc" } }),
    ]);

  return (
    <div className="grid gap-6 md:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="md:sticky md:top-20 md:self-start">
        <FilterForm
          competences={competences}
          expertises={expertises}
          secteurs={secteurs}
          typesMobilite={typesMobilite}
          zones={zones}
          seniorites={seniorites}
          defaults={{
            q,
            competence,
            expertise,
            secteur,
            mobilite,
            zone,
            seniorite,
            disponibilite,
            statutCandidatInterne,
          }}
        />
      </aside>

      <section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-brand-ink">
              Recherche avancée — base candidats (ATS)
            </h1>
            <p className="mt-1 text-sm text-brand-gray">
              Combinez les filtres pour cibler un profil dans votre vivier
              interne, publié ou non.
            </p>
          </div>
          <span className="rounded-full bg-brand-blue-bg px-3 py-1 text-sm font-medium text-brand-blue-dark">
            {consultants.length} candidat{consultants.length > 1 ? "s" : ""}
          </span>
        </div>

        {consultants.length === 0 ? (
          <div className="card border-dashed p-10 text-center">
            <p className="text-brand-body">Aucun candidat ne correspond à ces critères.</p>
            <p className="mt-1 text-sm text-brand-gray">
              Élargissez les filtres, ou{" "}
              <Link href="/admin/consultants/nouveau" className="link-underline">
                ajoutez un nouveau candidat
              </Link>
              .
            </p>
          </div>
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-100 bg-brand-blue-bg-soft text-left text-xs font-semibold uppercase tracking-wide text-brand-gray">
                <tr>
                  <th className="px-4 py-3">Référence</th>
                  <th className="px-4 py-3">Nom</th>
                  <th className="px-4 py-3">Poste</th>
                  <th className="px-4 py-3">Séniorité</th>
                  <th className="px-4 py-3">BM référent</th>
                  <th className="px-4 py-3">Statut candidat</th>
                  <th className="px-4 py-3">Publication</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {consultants.map((c) => (
                  <tr key={c.id} className="transition-colors hover:bg-brand-blue-bg-soft">
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/consultants/${c.id}`}
                        className="font-mono text-sm font-medium text-brand-ink hover:text-brand-blue-dark"
                      >
                        {c.referenceAnonyme}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-brand-body">
                      {c.prenom} {c.nom}
                    </td>
                    <td className="px-4 py-3 text-brand-body">{c.intitulePoste ?? "—"}</td>
                    <td className="px-4 py-3 text-brand-body">{c.seniority?.label ?? "—"}</td>
                    <td className="px-4 py-3 text-brand-body">{c.businessManager.name}</td>
                    <td className="px-4 py-3 text-brand-body">
                      {STATUT_CANDIDAT_INTERNE_LABELS[
                        c.statutCandidatInterne as keyof typeof STATUT_CANDIDAT_INTERNE_LABELS
                      ] ?? c.statutCandidatInterne}
                    </td>
                    <td className="px-4 py-3 text-brand-body">
                      {STATUT_PUBLICATION_LABELS[
                        c.statutPublication as keyof typeof STATUT_PUBLICATION_LABELS
                      ] ?? c.statutPublication}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      <Link
                        href={`/admin/consultants/${c.id}`}
                        className="link-underline text-sm text-brand-blue-dark"
                      >
                        Ouvrir
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
