import Link from "next/link";
import { requireStaff } from "@/lib/guards";
import { isAiGenerationConfigured } from "@/lib/ai-dc";
import GenerateIaForm from "./generate-ia-form";

export default async function GenererIaPage() {
  await requireStaff();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-brand-ink">
          ✨ Générer un dossier avec l&apos;IA
        </h1>
        <p className="mt-1 text-sm text-brand-gray">
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
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          La génération par IA n&apos;est pas configurée sur cet
          environnement (clé <code>ANTHROPIC_API_KEY</code> absente).
          Utilisez la{" "}
          <Link href="/admin/consultants/nouveau" className="underline">
            création manuelle
          </Link>{" "}
          en attendant.
        </div>
      )}

      <GenerateIaForm />
    </div>
  );
}
