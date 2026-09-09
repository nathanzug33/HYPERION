import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/guards";
import { canAccessOffre } from "@/lib/offre-access";
import { readCvFile, mimeTypeFor } from "@/lib/cv-storage";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireStaff();
  const { id } = await params;

  const candidature = await prisma.candidature.findUnique({
    where: { id },
    include: { offre: { select: { businessManagerId: true } } },
  });

  if (!candidature || !candidature.cvFileUrl) {
    return new Response("Introuvable", { status: 404 });
  }
  if (!canAccessOffre(session.user, candidature.offre)) {
    return new Response("Interdit", { status: 403 });
  }

  const buffer = await readCvFile(candidature.cvFileUrl);
  if (!buffer) {
    return new Response("Fichier introuvable sur le serveur", { status: 404 });
  }

  const filename = (
    candidature.cvFileNomOriginal || `CV_${candidature.prenom}_${candidature.nom}.pdf`
  )
    .replace(/[\r\n"]/g, "")
    .trim();

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": mimeTypeFor(candidature.cvFileUrl),
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
