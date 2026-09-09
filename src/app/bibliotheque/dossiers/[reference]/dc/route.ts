import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/guards";
import { ROLES } from "@/lib/constants";
import { buildDcDocx, dcConsultantInclude } from "@/lib/dc-docx";

/** DC (dossier de compétences) anonymisé, téléchargeable par tout compte
 * connecté (client ou staff) sur un profil publié. Le staff peut aussi
 * l'obtenir sur un profil non encore publié — aperçu de ce que verrait le
 * client une fois la publication faite (mêmes conditions que la fiche
 * elle-même, voir /admin/consultants/[id]/apercu). */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ reference: string }> }
) {
  const session = await requireSession();
  const { reference } = await params;

  const consultant = await prisma.consultant.findUnique({
    where: { referenceAnonyme: reference },
    include: dcConsultantInclude,
  });

  if (!consultant) {
    return new Response("Introuvable", { status: 404 });
  }

  const isStaff = session.user.role !== ROLES.CLIENT;
  if (consultant.statutPublication !== "PUBLIEE" && !isStaff) {
    return new Response("Introuvable", { status: 404 });
  }

  if (session.user.role === ROLES.CLIENT) {
    await prisma.consultationLog.create({
      data: { userId: session.user.id, consultantId: consultant.id },
    });
  }

  const buffer = await buildDcDocx(consultant, { anonymize: true });
  const filename = `DC_HYPERION_${consultant.referenceAnonyme}.docx`
    .replace(/\s+/g, "_")
    .replace(/[^\w.-]/g, "");

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
