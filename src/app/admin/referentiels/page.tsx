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
  ] = await Promise.all([
    prisma.secteur.findMany({ orderBy: { ordre: "asc" } }),
    prisma.expertise.findMany({ orderBy: { ordre: "asc" } }),
    prisma.seniorite.findMany({ orderBy: { ordre: "asc" } }),
    prisma.typeMobilite.findMany({ orderBy: { ordre: "asc" } }),
    prisma.zoneGeographique.findMany({ orderBy: { ordre: "asc" } }),
    prisma.competence.findMany({ orderBy: { label: "asc" } }),
    prisma.langue.findMany({ orderBy: { label: "asc" } }),
  ]);

  return [
    { type: "secteur", title: "Secteurs", items: secteurs },
    { type: "expertise", title: "Expertises / domaines", items: expertises },
    { type: "seniorite", title: "Niveaux de séniorité", items: seniorites },
    { type: "typeMobilite", title: "Types de mobilité", items: typesMobilite },
    { type: "zoneGeographique", title: "Zones géographiques", items: zones },
    { type: "competence", title: "Compétences / technologies", items: competences },
    { type: "langue", title: "Langues", items: langues },
  ];
}

export default async function ReferentielsPage() {
  await requireAdmin();
  const sections = await getSections();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Référentiels</h1>
        <p className="text-sm text-slate-500">
          Ces listes alimentent les filtres de la bibliothèque client et les
          formulaires de saisie des dossiers. Désactiver une valeur ne
          supprime pas l&apos;historique, elle disparaît simplement des
          nouveaux choix proposés.
        </p>
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
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="text-sm font-semibold text-slate-900 mb-3">{title}</h2>
      <ul className="space-y-1.5 mb-3">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex items-center justify-between gap-2 text-sm"
          >
            <span className={item.active ? "text-slate-700" : "text-slate-400 line-through"}>
              {item.label}
            </span>
            <form action={toggleReferentialActive}>
              <input type="hidden" name="type" value={type} />
              <input type="hidden" name="id" value={item.id} />
              <input type="hidden" name="active" value={String(item.active)} />
              <button
                type="submit"
                className="text-xs text-slate-500 underline hover:text-slate-800"
              >
                {item.active ? "Désactiver" : "Réactiver"}
              </button>
            </form>
          </li>
        ))}
        {items.length === 0 && (
          <li className="text-sm text-slate-400">Aucune valeur.</li>
        )}
      </ul>
      <form action={addReferentialItem} className="flex gap-2">
        <input type="hidden" name="type" value={type} />
        <input
          type="text"
          name="label"
          placeholder="Ajouter une valeur…"
          required
          className="flex-1 rounded-md border border-slate-300 px-2.5 py-1.5 text-sm focus:border-slate-900 focus:outline-none"
        />
        <button
          type="submit"
          className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700"
        >
          Ajouter
        </button>
      </form>
    </div>
  );
}
