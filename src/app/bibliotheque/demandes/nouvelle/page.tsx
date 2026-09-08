import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireClient } from "@/lib/guards";
import BesoinForm from "./besoin-form";

export default async function NouvelleDemandePage() {
  await requireClient();

  const seniorites = await prisma.seniorite.findMany({
    where: { active: true },
    orderBy: { ordre: "asc" },
  });

  return (
    <div className="max-w-2xl space-y-6">
      <Link href="/bibliotheque/demandes" className="link-underline text-sm text-brand-gray hover:text-brand-ink">
        ← Retour à mes demandes
      </Link>

      <div>
        <h1 className="text-2xl font-semibold text-brand-ink">Décrire un besoin</h1>
        <p className="mt-1 text-sm text-brand-gray">
          Pas encore de profil précis en tête ? Décrivez le poste à pourvoir
          et votre business manager vous proposera une sélection de dossiers
          correspondants.
        </p>
      </div>

      <BesoinForm seniorites={seniorites} />
    </div>
  );
}
