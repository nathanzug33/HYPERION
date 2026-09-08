import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/guards";
import { canAccessConsultant } from "@/lib/consultant-access";
import { readCvFile, mimeTypeFor } from "@/lib/cv-storage";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireStaff();
  const { id } = await params;

  const consultant = await prisma.consultant.findUnique({
    where: { id },
    select: {
      id: true,
      businessManagerId: true,
      cvFileUrl: true,
      cvFileNomOriginal: true,
      referenceAnonyme: true,
    },
  });

  if (!consultant || !consultant.cvFileUrl) {
    return new Response("Introuvable", { status: 404 });
  }
  if (!(await canAccessConsultant(session.user, consultant))) {
    return new Response("Interdit", { status: 403 });
  }

  const buffer = await readCvFile(consultant.cvFileUrl);
  if (!buffer) {
    return new Response("Fichier introuvable sur le serveur", { status: 404 });
  }

  const filename = (
    consultant.cvFileNomOriginal || `CV_${consultant.referenceAnonyme}.pdf`
  )
    .replace(/[\r\n"]/g, "")
    .trim();

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": mimeTypeFor(consultant.cvFileUrl),
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
