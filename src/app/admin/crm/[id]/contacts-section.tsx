import Link from "next/link";

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
    <div className="card p-5 space-y-3">
      <h2 className="text-sm font-semibold text-brand-ink">
        Interlocuteurs {contacts.length > 0 && `(${contacts.length})`}
      </h2>

      {contacts.length === 0 ? (
        <p className="text-xs text-brand-gray">Aucun interlocuteur enregistré pour le moment.</p>
      ) : (
        <div className="max-h-[420px] overflow-y-auto overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 border-b border-slate-100 bg-white text-left text-xs font-semibold uppercase tracking-wide text-brand-gray">
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
    </div>
  );
}
