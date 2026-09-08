import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/guards";
import { canAccessEntreprise } from "@/lib/crm-access";
import { readCrmFile, mimeTypeFor } from "@/lib/crm-storage";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; suiviId: string }> }
) {
  const session = await requireStaff();
  const { id, suiviId } = await params;

  const entreprise = await prisma.entreprise.findUnique({
    where: { id },
    select: { id: true, businessManagerId: true },
  });
  if (!entreprise || !canAccessEntreprise(session.user, entreprise)) {
    return new Response("Interdit", { status: 403 });
  }

  const suivi = await prisma.suiviCommercial.findUnique({
    where: { id: suiviId },
    select: { id: true, entrepriseId: true, fichierUrl: true, fichierNomOriginal: true, titre: true },
  });

  if (!suivi || suivi.entrepriseId !== id || !suivi.fichierUrl) {
    return new Response("Introuvable", { status: 404 });
  }

  const buffer = await readCrmFile(suivi.fichierUrl);
  if (!buffer) {
    return new Response("Fichier introuvable sur le serveur", { status: 404 });
  }

  const filename = (suivi.fichierNomOriginal || `${suivi.titre}.pdf`)
    .replace(/[\r\n"]/g, "")
    .trim();

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": mimeTypeFor(suivi.fichierUrl),
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
