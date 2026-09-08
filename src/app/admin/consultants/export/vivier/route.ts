import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/guards";
import { consultantVisibilityWhere } from "@/lib/consultant-access";
import { toCsv, csvResponse } from "@/lib/csv";
import {
  STATUT_PUBLICATION_LABELS,
  STATUT_CANDIDAT_INTERNE_LABELS,
} from "@/lib/constants";

export async function GET() {
  const session = await requireStaff();

  const consultants = await prisma.consultant.findMany({
    where: consultantVisibilityWhere(session.user),
    orderBy: { updatedAt: "desc" },
    include: { businessManager: true, seniority: true },
  });

  const csv = toCsv(
    [
      "Référence",
      "Prénom",
      "Nom",
      "Poste",
      "Séniorité",
      "BM référent",
      "Statut candidat",
      "Publication",
      "Ville",
      "Dernière mise à jour",
    ],
    consultants.map((c) => [
      c.referenceAnonyme,
      c.prenom,
      c.nom,
      c.intitulePoste ?? "",
      c.seniority?.label ?? "",
      c.businessManager.name,
      STATUT_CANDIDAT_INTERNE_LABELS[
        c.statutCandidatInterne as keyof typeof STATUT_CANDIDAT_INTERNE_LABELS
      ] ?? c.statutCandidatInterne,
      STATUT_PUBLICATION_LABELS[
        c.statutPublication as keyof typeof STATUT_PUBLICATION_LABELS
      ] ?? c.statutPublication,
      c.villeRattachement ?? "",
      new Date(c.updatedAt).toISOString(),
    ])
  );

  return csvResponse("vivier-candidats.csv", csv);
}
