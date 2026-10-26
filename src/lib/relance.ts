import { prisma } from "@/lib/prisma";

// Une proposition envoyée (push candidat -> contact CRM) est "à relancer" si
// c'est toujours le dernier événement enregistré pour ce contact, depuis
// plus de RELANCE_DELAI_MS — dès qu'un suivi plus récent existe (note,
// appel, réponse…), elle est considérée comme suivie et ne remonte plus.
// Pas de statut stocké : tout est dérivé de l'historique SuiviCommercial
// existant, comme le reste du CRM (ex. statut interne candidat déduit des
// suivis).

export const RELANCE_DELAI_MS = 7 * 24 * 60 * 60 * 1000;

/** Calcule, pour un lot de propositions déjà chargées, lesquelles sont à
 * relancer. Retourne un Map id -> booléen. */
export async function computeRelanceFlags<
  T extends { id: string; contactId: string | null; createdAt: Date },
>(propositions: T[]): Promise<Map<string, boolean>> {
  const contactIds = Array.from(
    new Set(propositions.map((p) => p.contactId).filter((cid): cid is string => Boolean(cid)))
  );
  const latest =
    contactIds.length > 0
      ? await prisma.suiviCommercial.groupBy({
          by: ["contactId"],
          where: { contactId: { in: contactIds } },
          _max: { createdAt: true },
        })
      : [];
  const latestCreatedAtByContact = new Map(
    latest.map((l) => [l.contactId as string, l._max.createdAt])
  );

  const now = Date.now();
  const flags = new Map<string, boolean>();
  for (const p of propositions) {
    const estDerniereAction =
      p.contactId != null &&
      latestCreatedAtByContact.get(p.contactId)?.getTime() === p.createdAt.getTime();
    flags.set(p.id, Boolean(estDerniereAction) && now - p.createdAt.getTime() > RELANCE_DELAI_MS);
  }
  return flags;
}
