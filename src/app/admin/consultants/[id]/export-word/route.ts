import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/guards";
import { buildDcDocx, dcConsultantInclude } from "@/lib/dc-docx";
import { canAccessConsultant } from "@/lib/consultant-access";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireStaff();
  const { id } = await params;

  const consultant = await prisma.consultant.findUnique({
    where: { id },
    include: dcConsultantInclude,
  });

  if (!consultant) {
    return new Response("Introuvable", { status: 404 });
  }
  if (!(await canAccessConsultant(session.user, consultant))) {
    return new Response("Interdit", { status: 403 });
  }

  const buffer = await buildDcDocx(consultant);
  const filename = `DC_HYPERION_${consultant.referenceAnonyme}_${consultant.nom}_${consultant.prenom}.docx`
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
