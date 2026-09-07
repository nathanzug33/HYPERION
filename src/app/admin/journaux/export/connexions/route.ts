import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { toCsv, csvResponse } from "@/lib/csv";
import { ROLES } from "@/lib/constants";

export async function GET() {
  const session = await auth();
  if (session?.user.role !== ROLES.ADMIN) {
    return new Response("Interdit", { status: 403 });
  }

  const logs = await prisma.loginLog.findMany({
    orderBy: { createdAt: "desc" },
    include: { user: true },
  });

  const csv = toCsv(
    ["Date", "Utilisateur", "Email", "Rôle"],
    logs.map((l) => [
      new Date(l.createdAt).toISOString(),
      l.user.name,
      l.user.email,
      l.user.role,
    ])
  );

  return csvResponse("journal-connexions.csv", csv);
}
