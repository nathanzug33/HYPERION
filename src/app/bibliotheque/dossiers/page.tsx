import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { ROLES, DISPONIBILITE } from "@/lib/constants";
import { consultantPublicSelect } from "@/lib/consultant-view";
import { findVille, distanceKm } from "@/lib/villes-france";
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

const RAYONS_KM = [25, 50, 100, 200, 300];

export default async function DossiersPage({
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
  const ville = typeof sp.ville === "string" ? sp.ville.trim() : "";
  const rayon = typeof sp.rayon === "string" ? Number(sp.rayon) || 50 : 50;

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

  // Recherche "ville + rayon" : la distance à vol d'oiseau ne se calcule pas
  // en SQL (SQLite), on filtre donc en mémoire après la requête — volumétrie
  // largement compatible avec une bibliothèque de dossiers de compétences.
  const villeRecherchee = ville ? findVille(ville) : null;
  const villeIntrouvable = Boolean(ville) && !villeRecherchee;
  const parVille = villeRecherchee
    ? consultants.filter(
        (c) =>
          c.villeLat != null &&
          c.villeLng != null &&
          distanceKm(villeRecherchee.lat, villeRecherchee.lng, c.villeLat, c.villeLng) <= rayon
      )
    : consultants;

  const sorted =
    tri === "disponibilite"
      ? [...parVille].sort(
          (a, b) =>
            DISPO_ORDER.indexOf(a.disponibilite ?? "") -
            DISPO_ORDER.indexOf(b.disponibilite ?? "")
        )
      : parVille;

  const canContact = session?.user.role === ROLES.CLIENT;

  return (
    <div className="grid gap-6 md:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="md:sticky md:top-20 md:self-start">
        <FilterForm
          secteurs={secteurs}
          expertises={expertises}
          seniorites={seniorites}
          typesMobilite={typesMobilite}
          zones={zones}
          rayons={RAYONS_KM}
          defaults={{ q, secteur, expertise, seniorite, mobilite, zone, disponibilite, tri, ville, rayon }}
        />
      </aside>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-brand-ink">
            Bibliothèque de profils
          </h1>
          <span className="rounded-full bg-brand-blue-bg px-3 py-1 text-sm font-medium text-brand-blue-dark">
            {sorted.length} profil{sorted.length > 1 ? "s" : ""}
          </span>
        </div>

        {villeIntrouvable && (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Ville « {ville} » non reconnue dans notre référentiel — essayez
            une ville plus importante à proximité, ou passez par les zones
            géographiques ci-dessous.
          </div>
        )}

        {sorted.length === 0 ? (
          <div className="card border-dashed p-10 text-center">
            <p className="text-brand-body">
              Aucun profil ne correspond à ces critères pour le moment.
            </p>
            <p className="mt-1 text-sm text-brand-gray">
              Élargissez vos filtres, ou décrivez-nous votre besoin
              directement — nous avons peut-être un profil non encore publié
              qui correspond.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
            {sorted.map((c) => (
              <ConsultantCard
                key={c.id}
                consultant={c}
                href={`/bibliotheque/dossiers/${c.referenceAnonyme}`}
                canContact={canContact}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
