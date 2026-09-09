import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/guards";
import { createEntrepriseAction } from "../actions";
import SecteurActiviteFields from "../secteur-activite-fields";

export default async function NouvelleEntreprisePage() {
  await requireStaff();
  const industries = await prisma.industrie.findMany({
    where: { active: true },
    orderBy: { ordre: "asc" },
  });

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-brand-ink">Nouvelle entreprise</h1>
        <p className="mt-1 text-sm text-brand-gray">
          Créez la fiche entreprise — vous pourrez y ajouter des
          interlocuteurs (contacts) et programmer un suivi juste après.
        </p>
      </div>

      <form action={createEntrepriseAction} className="card space-y-4 p-5">
        <div>
          <label className="block text-xs font-medium text-brand-body">Nom de l&apos;entreprise</label>
          <input name="nom" required className="input mt-1.5" />
        </div>
        <SecteurActiviteFields industries={industries} />
        <div>
          <label className="block text-xs font-medium text-brand-body">Taille (effectif)</label>
          <input name="tailleEffectif" placeholder="Ex. 50-200" className="input mt-1.5" />
        </div>
        <div>
          <label className="block text-xs font-medium text-brand-body">Site web</label>
          <input name="siteWeb" placeholder="https://…" className="input mt-1.5" />
        </div>
        <div>
          <label className="block text-xs font-medium text-brand-body">Adresse</label>
          <input name="adresse" className="input mt-1.5" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-brand-body">Code postal</label>
            <input name="codePostal" className="input mt-1.5" />
          </div>
          <div>
            <label className="block text-xs font-medium text-brand-body">Ville</label>
            <input name="ville" className="input mt-1.5" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-brand-body">Notes</label>
          <textarea name="notes" rows={3} className="input mt-1.5" />
        </div>
        <button type="submit" className="btn btn-primary w-full py-2.5">
          Créer l&apos;entreprise
        </button>
      </form>
    </div>
  );
}
