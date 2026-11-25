import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/guards";
import { entrepriseVisibilityWhere } from "@/lib/crm-access";

// Recherche globale de la barre latérale interne : un seul champ, trois
// familles de résultats (candidat ATS / interlocuteur CRM / société CRM)
// distinguées par pastille côté client — évite de confondre un candidat et
// un interlocuteur homonymes (cf. audit produit).
export async function GET(req: Request) {
  const session = await requireStaff();
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();

  if (q.length < 2) {
    return NextResponse.json({ candidats: [], contacts: [], entreprises: [] });
  }

  // Recherche par téléphone (ex. numéro inconnu qui appelle) : en plus du
  // numéro tel que tapé, on compare aussi sa version "chiffres seulement"
  // (espaces/points/tirets retirés) pour couvrir le cas où il est tapé
  // sans la mise en forme utilisée au moment de la saisie du dossier.
  // Ne couvre pas le cas inverse (tapé sans espaces, stocké avec) sans
  // normaliser aussi la colonne en base — à durcir si ça s'avère
  // insuffisant en usage réel.
  const qDigits = q.replace(/\D/g, "");
  const telephoneOr =
    qDigits.length >= 4
      ? [{ telephone: { contains: q } }, { telephone: { contains: qDigits } }]
      : [{ telephone: { contains: q } }];

  const [candidats, contacts, entreprises] = await Promise.all([
    prisma.consultant.findMany({
      where: {
        OR: [
          { nom: { contains: q, mode: "insensitive" } },
          { prenom: { contains: q, mode: "insensitive" } },
          ...telephoneOr,
        ],
      },
      select: { id: true, nom: true, prenom: true, referenceAnonyme: true },
      orderBy: { updatedAt: "desc" },
      take: 6,
    }),
    prisma.contact.findMany({
      where: {
        OR: [
          { nom: { contains: q, mode: "insensitive" } },
          { prenom: { contains: q, mode: "insensitive" } },
          ...telephoneOr,
        ],
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
    prisma.entreprise.findMany({
      where: {
        AND: [
          entrepriseVisibilityWhere(session.user),
          { nom: { contains: q, mode: "insensitive" } },
        ],
      },
      select: { id: true, nom: true, ville: true },
      orderBy: { updatedAt: "desc" },
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
    entreprises: entreprises.map((e) => ({
      id: e.id,
      nom: e.nom,
      ville: e.ville,
    })),
  });
}
