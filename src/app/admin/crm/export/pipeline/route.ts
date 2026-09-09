import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/guards";
import { entrepriseVisibilityWhere } from "@/lib/crm-access";
import { toCsv, csvResponse } from "@/lib/csv";
import { STATUT_ENTREPRISE_LABELS, formatSecteurActivite } from "@/lib/constants";

export async function GET() {
  const session = await requireStaff();

  const entreprises = await prisma.entreprise.findMany({
    where: entrepriseVisibilityWhere(session.user),
    orderBy: { updatedAt: "desc" },
    include: {
      businessManager: true,
      industrie: true,
      _count: { select: { contacts: true } },
    },
  });

  const csv = toCsv(
    [
      "Entreprise",
      "Secteur",
      "Ville",
      "Contacts",
      "BM référent",
      "Statut",
      "Créée le",
      "Dernière mise à jour",
    ],
    entreprises.map((e) => [
      e.nom,
      formatSecteurActivite(e.secteurCategorie, e.industrie?.label),
      e.ville ?? "",
      e._count.contacts,
      e.businessManager.name,
      STATUT_ENTREPRISE_LABELS[
        e.statutCommercial as keyof typeof STATUT_ENTREPRISE_LABELS
      ] ?? e.statutCommercial,
      new Date(e.createdAt).toISOString(),
      new Date(e.updatedAt).toISOString(),
    ])
  );

  return csvResponse("pipeline-crm.csv", csv);
}
