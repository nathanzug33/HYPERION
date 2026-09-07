import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { toCsv, csvResponse } from "@/lib/csv";
import { ROLES, CONTACT_REQUEST_STATUS_LABELS } from "@/lib/constants";

export async function GET() {
  const session = await auth();
  if (session?.user.role !== ROLES.ADMIN) {
    return new Response("Interdit", { status: 403 });
  }

  const requests = await prisma.contactRequest.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      consultant: true,
      clientUser: { include: { clientOrganization: true } },
      bmNotifie: true,
    },
  });

  const csv = toCsv(
    [
      "Date",
      "Profil",
      "Client",
      "Organisation",
      "Besoin",
      "Localisation",
      "Démarrage souhaité",
      "BM notifié",
      "Statut",
    ],
    requests.map((r) => [
      new Date(r.createdAt).toISOString(),
      r.consultant.referenceAnonyme,
      r.clientUser.name,
      r.clientUser.clientOrganization?.name ?? "",
      r.besoin,
      r.localisation ?? "",
      r.dateDemarrageSouhaitee
        ? new Date(r.dateDemarrageSouhaitee).toISOString().slice(0, 10)
        : "",
      r.bmNotifie?.name ?? "",
      CONTACT_REQUEST_STATUS_LABELS[
        r.status as keyof typeof CONTACT_REQUEST_STATUS_LABELS
      ] ?? r.status,
    ])
  );

  return csvResponse("journal-demandes.csv", csv);
}
