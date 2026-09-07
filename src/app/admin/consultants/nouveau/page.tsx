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
        <h1 className="text-xl font-semibold text-slate-900">
          Nouveau dossier de compétences
        </h1>
        <p className="text-sm text-slate-500">
          Renseignez d&apos;abord l&apos;identité du candidat. La référence
          anonyme est générée automatiquement ; les champs exposables se
          complètent à l&apos;étape suivante.
        </p>
      </div>

      <form
        action={createConsultantAction}
        className="space-y-4 rounded-lg border border-slate-200 bg-white p-4"
      >
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-700">Prénom</label>
            <input
              name="prenom"
              required
              className="mt-1 w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm focus:border-slate-900 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700">Nom</label>
            <input
              name="nom"
              required
              className="mt-1 w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm focus:border-slate-900 focus:outline-none"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700">Email</label>
          <input
            name="email"
            type="email"
            className="mt-1 w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm focus:border-slate-900 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700">Téléphone</label>
          <input
            name="telephone"
            className="mt-1 w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm focus:border-slate-900 focus:outline-none"
          />
        </div>
        {session.user.role === ROLES.ADMIN && (
          <div>
            <label className="block text-xs font-medium text-slate-700">
              Business manager référent
            </label>
            <select
              name="businessManagerId"
              required
              className="mt-1 w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm focus:border-slate-900 focus:outline-none"
            >
              {bms.map((bm) => (
                <option key={bm.id} value={bm.id}>
                  {bm.name}
                </option>
              ))}
            </select>
          </div>
        )}
        <button
          type="submit"
          className="w-full rounded-md bg-slate-900 py-2 text-sm font-medium text-white hover:bg-slate-700"
        >
          Créer le dossier
        </button>
      </form>
    </div>
  );
}
