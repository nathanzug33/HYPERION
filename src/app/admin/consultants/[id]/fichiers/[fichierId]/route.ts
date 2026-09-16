import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/guards";
import { canAccessConsultant } from "@/lib/consultant-access";
import { readCvFile, mimeTypeFor } from "@/lib/cv-storage";
import { readDcFile, mimeTypeForDc } from "@/lib/dc-storage";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string; fichierId: string }> }
) {
  const session = await requireStaff();
  const { id, fichierId } = await params;

  const consultant = await prisma.consultant.findUnique({
    where: { id },
    select: { id: true, businessManagerId: true },
  });
  if (!consultant) {
    return new Response("Introuvable", { status: 404 });
  }
  if (!(await canAccessConsultant(session.user, consultant))) {
    return new Response("Interdit", { status: 403 });
  }

  const fichier = await prisma.consultantFichier.findUnique({ where: { id: fichierId } });
  if (!fichier || fichier.consultantId !== id) {
    return new Response("Introuvable", { status: 404 });
  }

  const buffer =
    fichier.type === "CV" ? await readCvFile(fichier.storedName) : await readDcFile(fichier.storedName);
  if (!buffer) {
    return new Response("Fichier introuvable sur le serveur", { status: 404 });
  }

  const filename = fichier.nomOriginal.replace(/[\r\n"]/g, "").trim();
  const mimeType = fichier.type === "CV" ? mimeTypeFor(fichier.storedName) : mimeTypeForDc();

  // Aperçu (nouvel onglet) par défaut pour les types que le navigateur sait
  // rendre nativement (PDF) ; téléchargement forcé sinon (?disposition=
  // attachment, utilisé par le bouton "Télécharger" — un .doc/.docx ne
  // s'affiche de toute façon jamais inline, limitation du navigateur).
  const disposition = new URL(req.url).searchParams.get("disposition") === "attachment"
    ? "attachment"
    : "inline";

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": mimeType,
      "Content-Disposition": `${disposition}; filename="${filename}"`,
    },
  });
}
