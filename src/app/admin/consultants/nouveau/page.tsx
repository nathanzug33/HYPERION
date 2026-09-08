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
        <div>
          <label className="block text-xs font-medium text-brand-body">
            CV (optionnel) — .pdf, .doc ou .docx
          </label>
          <input
            type="file"
            name="cvFile"
            accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="mt-1.5 block w-full rounded-lg border border-dashed border-brand-blue-light/60 bg-brand-blue-bg-soft/40 px-3 py-3 text-xs text-brand-gray transition-colors hover:border-brand-blue file:mr-3 file:rounded-md file:border-0 file:bg-brand-blue file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-white"
          />
          <p className="mt-1 text-xs text-brand-gray">
            Peut aussi être ajouté ou remplacé plus tard depuis la fiche.
          </p>
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
