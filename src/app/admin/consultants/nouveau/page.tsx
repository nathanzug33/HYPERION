import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/guards";
import { ROLES } from "@/lib/constants";
import { createConsultantAction } from "../actions";

export default async function NouveauConsultantPage() {
  const session = await requireStaff();
  const bms =
    session.user.role === ROLES.ADMIN
      ? await prisma.user.findMany({
          where: { role: ROLES.BM, active: true },
          orderBy: { name: "asc" },
        })
      : [];

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-brand-ink">
          Nouveau dossier de compétences
        </h1>
        <p className="mt-1 text-sm text-brand-gray">
          Renseignez d&apos;abord l&apos;identité du candidat. La référence
          anonyme est générée automatiquement ; les champs exposables se
          complètent à l&apos;étape suivante.
        </p>
      </div>

      <form action={createConsultantAction} className="card space-y-4 p-5">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-brand-body">Prénom</label>
            <input name="prenom" required className="input mt-1.5" />
          </div>
          <div>
            <label className="block text-xs font-medium text-brand-body">Nom</label>
            <input name="nom" required className="input mt-1.5" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-brand-body">Email</label>
          <input name="email" type="email" className="input mt-1.5" />
        </div>
        <div>
          <label className="block text-xs font-medium text-brand-body">Téléphone</label>
          <input name="telephone" className="input mt-1.5" />
        </div>
        {session.user.role === ROLES.ADMIN && (
          <div>
            <label className="block text-xs font-medium text-brand-body">
              Business manager référent
            </label>
            <select name="businessManagerId" required className="input mt-1.5">
              {bms.map((bm) => (
                <option key={bm.id} value={bm.id}>
                  {bm.name}
                </option>
              ))}
            </select>
          </div>
        )}
        <button type="submit" className="btn btn-primary w-full py-2.5">
          Créer le dossier
        </button>
      </form>
    </div>
  );
}
