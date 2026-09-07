import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/guards";
import { ROLES } from "@/lib/constants";
import { isAiGenerationConfigured } from "@/lib/ai-dc";
import GenerateIaForm from "./generate-ia-form";

export default async function GenererIaPage() {
  const session = await requireStaff();
  const bms =
    session.user.role === ROLES.ADMIN
      ? await prisma.user.findMany({
          where: { role: ROLES.BM, active: true },
          orderBy: { name: "asc" },
        })
      : [];

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-brand-ink">
          Générer un dossier avec l&apos;IA
        </h1>
        <p className="text-sm text-brand-gray">
          Déposez le CV (ou un dossier déjà existant, même dans un autre
          format) — la transcription de l&apos;entretien est facultative :
          l&apos;IA pré-remplit un dossier complet au format HYPERION
          (poste, séniorité, mobilité, disponibilité, expériences,
          compétences, formations, langues). Le dossier est créé en{" "}
          <strong>brouillon</strong> — vérifiez-le et complétez le nom avant
          de le publier.
        </p>
      </div>

      {!isAiGenerationConfigured() && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          La génération par IA n&apos;est pas configurée sur cet
          environnement (clé <code>ANTHROPIC_API_KEY</code> absente).
          Utilisez la{" "}
          <Link href="/admin/consultants/nouveau" className="underline">
            création manuelle
          </Link>{" "}
          en attendant.
        </div>
      )}

      <GenerateIaForm bms={bms} isAdmin={session.user.role === ROLES.ADMIN} />
    </div>
  );
}
