import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/guards";
import { buildDcDocx, dcConsultantInclude, formatDcFilename } from "@/lib/dc-docx";
import { canAccessConsultant } from "@/lib/consultant-access";
import { saveDcFile } from "@/lib/dc-storage";

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
  const filename = formatDcFilename(consultant.nom, consultant.prenom);

  // Conservé comme pièce jointe (historique des DC générés, voir l'onglet
  // "Pièces jointes") — best-effort : un échec de stockage ne doit jamais
  // empêcher le téléchargement lui-même.
  try {
    const saved = await saveDcFile(buffer, filename);
    await prisma.consultantFichier.create({
      data: {
        consultantId: id,
        type: "DC",
        storedName: saved.storedName,
        nomOriginal: saved.originalName,
        createdById: session.user.id,
      },
    });
  } catch (err) {
    console.error("[export-word] Échec de l'enregistrement du DC en pièce jointe :", err);
  }

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
