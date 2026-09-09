import Link from "next/link";
import { createContactAction } from "../actions";

type Contact = {
  id: string;
  prenom: string;
  nom: string;
  fonction: string | null;
  email: string | null;
  telephone: string | null;
  principal: boolean;
};

export default function ContactsSection({
  entrepriseId,
  contacts,
}: {
  entrepriseId: string;
  contacts: Contact[];
}) {
  return (
    <div className="card p-5 space-y-4">
      <h2 className="text-sm font-semibold text-brand-ink">Interlocuteurs</h2>

      {contacts.length === 0 ? (
        <p className="text-xs text-brand-gray">Aucun interlocuteur enregistré pour le moment.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-brand-gray">
              <tr>
                <th className="py-2 pr-3">Nom</th>
                <th className="py-2 pr-3">Prénom</th>
                <th className="py-2 pr-3">Poste</th>
                <th className="py-2 pr-3">Email</th>
                <th className="py-2 pr-3">Téléphone</th>
                <th className="py-2 pr-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {contacts.map((c) => (
                <tr key={c.id} className="transition-colors hover:bg-brand-blue-bg-soft">
                  <td className="py-2 pr-3">
                    <Link
                      href={`/admin/crm/${entrepriseId}/contacts/${c.id}`}
                      className="font-medium text-brand-ink hover:text-brand-blue-dark"
                    >
                      {c.nom}
                    </Link>
                    {c.principal && (
                      <span className="ml-1.5 rounded-full bg-brand-blue-bg px-1.5 py-0.5 text-[10px] font-medium text-brand-blue-dark">
                        Principal
                      </span>
                    )}
                  </td>
                  <td className="py-2 pr-3 text-brand-body">{c.prenom}</td>
                  <td className="py-2 pr-3 text-brand-body">{c.fonction ?? "—"}</td>
                  <td className="py-2 pr-3 text-brand-body">{c.email ?? "—"}</td>
                  <td className="py-2 pr-3 text-brand-body">{c.telephone ?? "—"}</td>
                  <td className="py-2 pr-3 whitespace-nowrap text-right">
                    <Link
                      href={`/admin/crm/${entrepriseId}/contacts/${c.id}`}
                      className="link-underline text-xs text-brand-blue-dark"
                    >
                      Ouvrir
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <form
        action={createContactAction}
        className="grid grid-cols-2 gap-2 rounded-lg border border-dashed border-brand-blue-light/60 bg-brand-blue-bg-soft/40 p-3 sm:grid-cols-5 sm:items-end"
      >
        <input type="hidden" name="entrepriseId" value={entrepriseId} />
        <div>
          <label className="block text-[11px] text-brand-gray">Prénom</label>
          <input name="prenom" required className="input text-xs" />
        </div>
        <div>
          <label className="block text-[11px] text-brand-gray">Nom</label>
          <input name="nom" required className="input text-xs" />
        </div>
        <div>
          <label className="block text-[11px] text-brand-gray">Poste</label>
          <input name="fonction" placeholder="Ex. Responsable qualité" className="input text-xs" />
        </div>
        <div>
          <label className="block text-[11px] text-brand-gray">Email</label>
          <input name="email" type="email" className="input text-xs" />
        </div>
        <div className="flex gap-2">
          <input name="telephone" placeholder="Téléphone" className="input text-xs" />
          <button type="submit" className="btn btn-secondary shrink-0 py-1.5 text-xs">
            + Ajouter
          </button>
        </div>
      </form>
    </div>
  );
}
