import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { ROLES, DISPONIBILITE } from "@/lib/constants";
import { consultantPublicSelect } from "@/lib/consultant-view";
import ConsultantCard from "@/components/consultant/ConsultantCard";
import FilterForm from "./filter-form";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

function toArray(v: string | string[] | undefined): string[] {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

const DISPO_ORDER: string[] = [
  DISPONIBILITE.IMMEDIATE,
  DISPONIBILITE.SOUS_1_MOIS,
  DISPONIBILITE.SOUS_2_MOIS,
  DISPONIBILITE.SUR_PREAVIS,
];

export default async function BibliothequePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth();
  const sp = await searchParams;

  const q = typeof sp.q === "string" ? sp.q : "";
  const secteur = toArray(sp.secteur);
  const expertise = toArray(sp.expertise);
  const seniorite = toArray(sp.seniorite);
  const mobilite = toArray(sp.mobilite);
  const zone = toArray(sp.zone);
  const disponibilite = toArray(sp.disponibilite);
  const tri = typeof sp.tri === "string" ? sp.tri : "maj";

  const where: Prisma.ConsultantWhereInput = {
    statutPublication: "PUBLIEE",
    ...(secteur.length ? { secteurs: { some: { secteurId: { in: secteur } } } } : {}),
    ...(expertise.length
      ? { expertises: { some: { expertiseId: { in: expertise } } } }
      : {}),
    ...(seniorite.length ? { seniorityId: { in: seniorite } } : {}),
    ...(mobilite.length
      ? { typesMobilite: { some: { typeMobiliteId: { in: mobilite } } } }
      : {}),
    ...(zone.length
      ? { zonesGeographiques: { some: { zoneGeographiqueId: { in: zone } } } }
      : {}),
    ...(disponibilite.length ? { disponibilite: { in: disponibilite } } : {}),
    ...(q
      ? {
          OR: [
            { intitulePoste: { contains: q } },
            { resumeContexte: { contains: q } },
            { competences: { some: { competence: { label: { contains: q } } } } },
          ],
        }
      : {}),
  };

  const orderBy: Prisma.ConsultantOrderByWithRelationInput =
    tri === "seniorite"
      ? { seniority: { ordre: "desc" } }
      : { updatedAt: "desc" };

  const [consultants, secteurs, expertises, seniorites, typesMobilite, zones] =
    await Promise.all([
      prisma.consultant.findMany({
        where,
        orderBy,
        select: consultantPublicSelect,
      }),
      prisma.secteur.findMany({ where: { active: true }, orderBy: { ordre: "asc" } }),
      prisma.expertise.findMany({ where: { active: true }, orderBy: { ordre: "asc" } }),
      prisma.seniorite.findMany({ where: { active: true }, orderBy: { ordre: "asc" } }),
      prisma.typeMobilite.findMany({ where: { active: true }, orderBy: { ordre: "asc" } }),
      prisma.zoneGeographique.findMany({ where: { active: true }, orderBy: { ordre: "asc" } }),
    ]);

  const sorted =
    tri === "disponibilite"
      ? [...consultants].sort(
          (a, b) =>
            DISPO_ORDER.indexOf(a.disponibilite ?? "") -
            DISPO_ORDER.indexOf(b.disponibilite ?? "")
        )
      : consultants;

  const canContact = session?.user.role === ROLES.CLIENT;

  return (
    <div className="grid gap-6 md:grid-cols-[260px_minmax(0,1fr)]">
      <aside>
        <FilterForm
          secteurs={secteurs}
          expertises={expertises}
          seniorites={seniorites}
          typesMobilite={typesMobilite}
          zones={zones}
          defaults={{ q, secteur, expertise, seniorite, mobilite, zone, disponibilite, tri }}
        />
      </aside>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-slate-900">
            Bibliothèque de profils
          </h1>
          <span className="text-sm text-slate-500">
            {sorted.length} profil{sorted.length > 1 ? "s" : ""}
          </span>
        </div>

        {sorted.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
            <p className="text-slate-600">
              Aucun profil ne correspond à ces critères pour le moment.
            </p>
            <p className="mt-1 text-sm text-slate-400">
              Élargissez vos filtres, ou décrivez-nous votre besoin
              directement — nous avons peut-être un profil non encore publié
              qui correspond.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {sorted.map((c) => (
              <ConsultantCard
                key={c.id}
                consultant={c}
                href={`/bibliotheque/${c.referenceAnonyme}`}
                canContact={canContact}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
