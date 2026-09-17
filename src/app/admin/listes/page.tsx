import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/guards";
import { SAVED_LIST_SCOPE_LABELS, SAVED_LIST_VISIBILITY } from "@/lib/constants";
import { deleteSavedListAction, toggleSavedListVisibilityAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function ListesPage() {
  const session = await requireStaff();

  const [mesListes, listesPartagees] = await Promise.all([
    prisma.savedList.findMany({
      where: { ownerId: session.user.id },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.savedList.findMany({
      where: { visibility: SAVED_LIST_VISIBILITY.PARTAGEE, ownerId: { not: session.user.id } },
      orderBy: { updatedAt: "desc" },
      include: { owner: true },
    }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-brand-ink">Listes</h1>
        <p className="mt-1 text-sm text-brand-gray">
          Recherches enregistrées (candidats, entreprises, contacts) — à rejouer en un clic
          depuis la Recherche avancée ou les listes CRM (bouton « Enregistrer cette
          recherche »).
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-brand-blue-dark">
          Mes listes
        </h2>
        {mesListes.length === 0 ? (
          <p className="text-sm text-brand-gray">
            Aucune liste enregistrée pour l&apos;instant. Depuis une recherche filtrée, cliquez
            sur « Enregistrer cette recherche » pour la retrouver ici.
          </p>
        ) : (
          <div className="card divide-y divide-slate-100">
            {mesListes.map((l) => (
              <ListRow key={l.id} list={l} isOwner />
            ))}
          </div>
        )}
      </section>

      {listesPartagees.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-brand-blue-dark">
            Partagées par l&apos;équipe
          </h2>
          <div className="card divide-y divide-slate-100">
            {listesPartagees.map((l) => (
              <ListRow key={l.id} list={l} isOwner={false} ownerName={l.owner.name} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function ListRow({
  list,
  isOwner,
  ownerName,
}: {
  list: { id: string; name: string; scope: string; path: string; queryString: string; visibility: string };
  isOwner: boolean;
  ownerName?: string;
}) {
  const href = `${list.path}${list.queryString ? `?${list.queryString}` : ""}`;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
      <div>
        <div className="flex items-center gap-2">
          <span className="font-medium text-brand-ink">{list.name}</span>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-brand-gray">
            {SAVED_LIST_SCOPE_LABELS[list.scope as keyof typeof SAVED_LIST_SCOPE_LABELS] ?? list.scope}
          </span>
        </div>
        {ownerName && <p className="mt-0.5 text-xs text-brand-gray">Créée par {ownerName}</p>}
      </div>
      <div className="flex items-center gap-3">
        <Link href={href} className="link-underline text-sm text-brand-blue-dark">
          Lancer
        </Link>
        {isOwner && (
          <>
            <form action={toggleSavedListVisibilityAction}>
              <input type="hidden" name="id" value={list.id} />
              <button type="submit" className="link-underline text-xs text-brand-gray hover:text-brand-ink">
                {list.visibility === SAVED_LIST_VISIBILITY.PARTAGEE ? "Rendre privée" : "Partager à l'équipe"}
              </button>
            </form>
            <form action={deleteSavedListAction}>
              <input type="hidden" name="id" value={list.id} />
              <button type="submit" className="link-underline text-xs text-red-600 hover:text-red-700">
                Supprimer
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
