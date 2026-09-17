import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/guards";
import { consultantVisibilityWhere } from "@/lib/consultant-access";
import {
  STATUT_PUBLICATION_LABELS,
  STATUT_CANDIDAT_INTERNE_LABELS,
} from "@/lib/constants";
import { parseSort, nextSort } from "@/lib/sort";
import { resolveWeekOffset } from "@/lib/periode";
import SortableHeader from "@/components/SortableHeader";
import FilterForm from "./filter-form";
import SaveListButton from "@/components/SaveListButton";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

const SORT_KEYS = ["ref", "nom", "poste", "seniorite", "bm", "statutCandidat", "publication"] as const;

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
  const suiviType = typeof sp.suiviType === "string" ? sp.suiviType : "";
  const suiviPeriode = typeof sp.suiviPeriode === "string" ? sp.suiviPeriode : "semaine";
  const suiviDebut = typeof sp.suiviDebut === "string" ? sp.suiviDebut : "";
  const suiviFin = typeof sp.suiviFin === "string" ? sp.suiviFin : "";

  // Filtre "suivi réalisé" (ex. entretiens de la semaine, pour préparer la
  // réunion du lundi) : dateProgrammee dans la période ET fait=true — même
  // sémantique de "réalisé" que le score hebdomadaire du tableau de bord
  // (jamais déduit du simple fait que la date soit passée).
  function resolveSuiviRange(): { debut: Date; fin: Date } | null {
    if (suiviPeriode === "custom") {
      if (!suiviDebut || !suiviFin) return null;
      return { debut: new Date(`${suiviDebut}T00:00:00`), fin: new Date(`${suiviFin}T23:59:59.999`) };
    }
    if (suiviPeriode === "semaine_derniere") return resolveWeekOffset(-1);
    if (suiviPeriode === "mois") {
      const now = new Date();
      return {
        debut: new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0),
        fin: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999),
      };
    }
    return resolveWeekOffset(0);
  }
  const suiviRange = suiviType ? resolveSuiviRange() : null;

  // Tri par colonne — cycle A→Z / Z→A / tri par défaut (dernière mise à
  // jour) au clic sur l'en-tête ; les autres filtres (multi-valeurs) sont
  // préservés tels quels dans l'URL.
  const sortParam = typeof sp.sort === "string" ? sp.sort : undefined;
  const sortState = parseSort(sortParam, SORT_KEYS);
  function hrefFor(key: string) {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) {
      if (k === "sort") continue;
      if (Array.isArray(v)) {
        for (const item of v) params.append(k, item);
      } else if (v) {
        params.set(k, v);
      }
    }
    const target = nextSort(key, sortState);
    if (target) params.set("sort", target);
    const qs = params.toString();
    return `/admin/consultants/recherche${qs ? `?${qs}` : ""}`;
  }

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
      suiviType && suiviRange
        ? {
            suivis: {
              some: {
                type: suiviType,
                dateProgrammee: { gte: suiviRange.debut, lte: suiviRange.fin },
                fait: true,
              },
            },
          }
        : {},
      q
        ? {
            OR: [
              { nom: { contains: q, mode: "insensitive" } },
              { prenom: { contains: q, mode: "insensitive" } },
              { referenceAnonyme: { contains: q, mode: "insensitive" } },
              { intitulePoste: { contains: q, mode: "insensitive" } },
              { sourceCvTexte: { contains: q, mode: "insensitive" } },
              { notesEntretien: { contains: q, mode: "insensitive" } },
              { resumeContexte: { contains: q, mode: "insensitive" } },
              {
                competences: {
                  some: { competence: { label: { contains: q, mode: "insensitive" } } },
                },
              },
            ],
          }
        : {},
    ],
  };

  const [consultants, competences, expertises, secteurs, typesMobilite, zones, seniorites] =
    await Promise.all([
      prisma.consultant.findMany({
        where,
        orderBy:
          sortState.key === "ref"
            ? { referenceAnonyme: sortState.dir }
            : sortState.key === "nom"
              ? [{ nom: sortState.dir }, { prenom: sortState.dir }]
              : sortState.key === "poste"
                ? { intitulePoste: sortState.dir }
                : sortState.key === "seniorite"
                  ? { seniority: { ordre: sortState.dir } }
                  : sortState.key === "bm"
                    ? { businessManager: { name: sortState.dir } }
                    : sortState.key === "statutCandidat"
                      ? { statutCandidatInterne: sortState.dir }
                      : sortState.key === "publication"
                        ? { statutPublication: sortState.dir }
                        : { updatedAt: "desc" },
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
            suiviType,
            suiviPeriode,
            suiviDebut,
            suiviFin,
          }}
        />
      </aside>

      <section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-brand-ink">
              Recherche avancée — base candidats (ATS)
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-brand-blue-bg px-3 py-1 text-sm font-medium text-brand-blue-dark">
              {consultants.length} candidat{consultants.length > 1 ? "s" : ""}
            </span>
            <SaveListButton scope="ATS_CANDIDATS" />
          </div>
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
                  <th className="px-4 py-3">
                    <SortableHeader label="Référence" sortKey="ref" current={sortState} href={hrefFor("ref")} />
                  </th>
                  <th className="px-4 py-3">
                    <SortableHeader label="Nom" sortKey="nom" current={sortState} href={hrefFor("nom")} />
                  </th>
                  <th className="px-4 py-3">
                    <SortableHeader label="Poste" sortKey="poste" current={sortState} href={hrefFor("poste")} />
                  </th>
                  <th className="px-4 py-3">
                    <SortableHeader
                      label="Séniorité"
                      sortKey="seniorite"
                      current={sortState}
                      href={hrefFor("seniorite")}
                    />
                  </th>
                  <th className="px-4 py-3">
                    <SortableHeader label="BM référent" sortKey="bm" current={sortState} href={hrefFor("bm")} />
                  </th>
                  <th className="px-4 py-3">
                    <SortableHeader
                      label="Statut candidat"
                      sortKey="statutCandidat"
                      current={sortState}
                      href={hrefFor("statutCandidat")}
                    />
                  </th>
                  <th className="px-4 py-3">
                    <SortableHeader
                      label="Publication"
                      sortKey="publication"
                      current={sortState}
                      href={hrefFor("publication")}
                    />
                  </th>
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
