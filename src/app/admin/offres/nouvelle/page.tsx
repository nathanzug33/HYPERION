import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/guards";
import { canAccessEntreprise } from "@/lib/crm-access";
import { TYPE_CONTRAT_OFFRE_LABELS } from "@/lib/constants";
import { createOffreAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function NouvelleOffrePage({
  searchParams,
}: {
  searchParams: Promise<{ besoinId?: string }>;
}) {
  const session = await requireStaff();
  const { besoinId } = await searchParams;

  const besoin = besoinId
    ? await prisma.besoin.findUnique({ where: { id: besoinId }, include: { entreprise: true } })
    : null;
  if (besoinId && !besoin) redirect("/admin/offres/nouvelle");
  if (besoin && !canAccessEntreprise(session.user, besoin.entreprise)) redirect("/admin/crm");

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-brand-ink">
          {besoin ? `Nouvelle offre — à partir du besoin` : "Nouvelle offre"}
        </h1>
        <p className="mt-1 text-sm text-brand-gray">
          {besoin ? (
            <>
              Pré-remplie depuis « {besoin.intitulePoste} » chez{" "}
              <Link href={`/admin/crm/${besoin.entrepriseId}`} className="link-underline text-brand-blue-dark">
                {besoin.entreprise.nom}
              </Link>
              . Un même besoin peut donner lieu à plusieurs offres (ex. une en régie, une en CDI).
            </>
          ) : (
            "Offre libre, sans client identifié (sourcing proactif) — vous pourrez la relier à un besoin plus tard si besoin."
          )}
        </p>
      </div>

      <form action={createOffreAction} className="card space-y-3 p-5">
        {besoin && <input type="hidden" name="besoinId" value={besoin.id} />}
        <div>
          <label className="block text-xs font-medium text-brand-body">Titre de l&apos;offre</label>
          <input
            name="titre"
            required
            defaultValue={besoin?.intitulePoste ?? ""}
            className="input mt-1.5"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-brand-body">Descriptif du poste</label>
          <textarea
            name="descriptif"
            rows={5}
            defaultValue={besoin?.descriptifMissions ?? ""}
            className="input mt-1.5"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-brand-body">Profil recherché</label>
          <textarea
            name="profilRecherche"
            rows={3}
            placeholder="Compétences, séniorité, savoir-être attendus…"
            defaultValue={besoin?.seniorite ?? ""}
            className="input mt-1.5"
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-brand-body">Type de contrat</label>
            <select name="typeContratOffre" defaultValue="" className="input mt-1.5">
              <option value="">—</option>
              {Object.entries(TYPE_CONTRAT_OFFRE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-brand-body">Localisation</label>
            <input
              name="localisation"
              defaultValue={besoin?.localisation ?? ""}
              className="input mt-1.5"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-brand-body">TJM min (€/j)</label>
            <input
              type="number"
              name="tjmMin"
              min={0}
              defaultValue={besoin?.tjmCibleMin ?? ""}
              className="input mt-1.5"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-brand-body">TJM max (€/j)</label>
            <input
              type="number"
              name="tjmMax"
              min={0}
              defaultValue={besoin?.tjmCibleMax ?? ""}
              className="input mt-1.5"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-brand-body">Salaire min (€/an)</label>
            <input type="number" name="salaireMin" min={0} className="input mt-1.5" />
          </div>
          <div>
            <label className="block text-xs font-medium text-brand-body">Salaire max (€/an)</label>
            <input type="number" name="salaireMax" min={0} className="input mt-1.5" />
          </div>
          <div>
            <label className="block text-xs font-medium text-brand-body">Démarrage souhaité</label>
            <input
              type="date"
              name="dateDemarrage"
              defaultValue={
                besoin?.dateDemarrageSouhaitee
                  ? besoin.dateDemarrageSouhaitee.toISOString().slice(0, 10)
                  : ""
              }
              className="input mt-1.5"
            />
          </div>
        </div>
        <div className="flex items-center justify-between pt-2">
          <Link
            href={besoin ? `/admin/crm/${besoin.entrepriseId}/besoins/${besoin.id}` : "/admin/offres"}
            className="link-underline text-sm text-brand-gray hover:text-brand-ink"
          >
            Annuler
          </Link>
          <button type="submit" className="btn btn-primary">
            Créer en brouillon
          </button>
        </div>
      </form>
    </div>
  );
}
