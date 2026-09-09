import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/guards";
import { addReferentialItem, toggleReferentialActive } from "./actions";
import type { ReferentialType } from "@/lib/referentials";

export const dynamic = "force-dynamic";

type Item = { id: string; label: string; active: boolean };

async function getSections(): Promise<
  Array<{ type: ReferentialType; title: string; items: Item[] }>
> {
  const [
    secteurs,
    expertises,
    seniorites,
    typesMobilite,
    zones,
    competences,
    langues,
    industries,
  ] = await Promise.all([
    prisma.secteur.findMany({ orderBy: { ordre: "asc" } }),
    prisma.expertise.findMany({ orderBy: { ordre: "asc" } }),
    prisma.seniorite.findMany({ orderBy: { ordre: "asc" } }),
    prisma.typeMobilite.findMany({ orderBy: { ordre: "asc" } }),
    prisma.zoneGeographique.findMany({ orderBy: { ordre: "asc" } }),
    prisma.competence.findMany({ orderBy: { label: "asc" } }),
    prisma.langue.findMany({ orderBy: { label: "asc" } }),
    prisma.industrie.findMany({ orderBy: { ordre: "asc" } }),
  ]);

  return [
    { type: "secteur", title: "Secteurs", items: secteurs },
    { type: "expertise", title: "Expertises / domaines", items: expertises },
    { type: "seniorite", title: "Niveaux de séniorité", items: seniorites },
    { type: "typeMobilite", title: "Types de mobilité", items: typesMobilite },
    { type: "zoneGeographique", title: "Zones géographiques", items: zones },
    { type: "competence", title: "Compétences / technologies", items: competences },
    { type: "langue", title: "Langues", items: langues },
    { type: "industrie", title: "Industries (sous-secteurs)", items: industries },
  ];
}

export default async function ReferentielsPage() {
  await requireAdmin();
  const sections = await getSections();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-brand-ink">Référentiels</h1>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        {sections.map((section) => (
          <ReferentialSection key={section.type} {...section} />
        ))}
      </div>
    </div>
  );
}

function ReferentialSection({
  type,
  title,
  items,
}: {
  type: ReferentialType;
  title: string;
  items: Item[];
}) {
  return (
    <div className="card p-5">
      <h2 className="text-sm font-semibold text-brand-ink mb-3">{title}</h2>
      <ul className="space-y-1.5 mb-3">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex items-center justify-between gap-2 rounded px-1.5 py-1 text-sm transition-colors hover:bg-brand-blue-bg-soft"
          >
            <span className={item.active ? "text-brand-body" : "text-brand-gray line-through"}>
              {item.label}
            </span>
            <form action={toggleReferentialActive}>
              <input type="hidden" name="type" value={type} />
              <input type="hidden" name="id" value={item.id} />
              <input type="hidden" name="active" value={String(item.active)} />
              <button
                type="submit"
                className="link-underline text-xs text-brand-gray hover:text-brand-ink"
              >
                {item.active ? "Désactiver" : "Réactiver"}
              </button>
            </form>
          </li>
        ))}
        {items.length === 0 && (
          <li className="text-sm text-brand-gray">Aucune valeur.</li>
        )}
      </ul>
      <form action={addReferentialItem} className="flex gap-2">
        <input type="hidden" name="type" value={type} />
        <input
          type="text"
          name="label"
          placeholder="Ajouter une valeur…"
          required
          className="input flex-1"
        />
        <button
          type="submit"
          className="btn btn-primary"
        >
          Ajouter
        </button>
      </form>
    </div>
  );
}
