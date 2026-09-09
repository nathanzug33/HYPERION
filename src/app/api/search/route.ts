import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/guards";
import { entrepriseVisibilityWhere } from "@/lib/crm-access";

// Recherche globale de la barre latérale interne : un seul champ, deux
// familles de résultats (candidat ATS / interlocuteur CRM) distinguées par
// pastille côté client — évite de confondre un candidat et un interlocuteur
// homonymes (cf. audit produit).
export async function GET(req: Request) {
  const session = await requireStaff();
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();

  if (q.length < 2) {
    return NextResponse.json({ candidats: [], contacts: [] });
  }

  const [candidats, contacts] = await Promise.all([
    prisma.consultant.findMany({
      where: { OR: [{ nom: { contains: q } }, { prenom: { contains: q } }] },
      select: { id: true, nom: true, prenom: true, referenceAnonyme: true },
      orderBy: { updatedAt: "desc" },
      take: 6,
    }),
    prisma.contact.findMany({
      where: {
        OR: [{ nom: { contains: q } }, { prenom: { contains: q } }],
        entreprise: entrepriseVisibilityWhere(session.user),
      },
      select: {
        id: true,
        nom: true,
        prenom: true,
        entrepriseId: true,
        entreprise: { select: { nom: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
  ]);

  return NextResponse.json({
    candidats: candidats.map((c) => ({
      id: c.id,
      nom: c.nom,
      prenom: c.prenom,
      reference: c.referenceAnonyme,
    })),
    contacts: contacts.map((c) => ({
      id: c.id,
      nom: c.nom,
      prenom: c.prenom,
      entrepriseId: c.entrepriseId,
      entrepriseNom: c.entreprise.nom,
    })),
  });
}
