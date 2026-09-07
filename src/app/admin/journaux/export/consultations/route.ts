import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { toCsv, csvResponse } from "@/lib/csv";
import { ROLES } from "@/lib/constants";

export async function GET() {
  const session = await auth();
  if (session?.user.role !== ROLES.ADMIN) {
    return new Response("Interdit", { status: 403 });
  }

  const logs = await prisma.consultationLog.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: { include: { clientOrganization: true } },
      consultant: true,
    },
  });

  const csv = toCsv(
    ["Date", "Client", "Organisation", "Profil consulté", "Poste"],
    logs.map((l) => [
      new Date(l.createdAt).toISOString(),
      l.user.name,
      l.user.clientOrganization?.name ?? "",
      l.consultant.referenceAnonyme,
      l.consultant.intitulePoste ?? "",
    ])
  );

  return csvResponse("journal-consultations.csv", csv);
}
