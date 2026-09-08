import { createContactAction, updateContactAction, deleteContactAction } from "../actions";

type Contact = {
  id: string;
  prenom: string;
  nom: string;
  fonction: string | null;
  email: string | null;
  telephone: string | null;
  notes: string | null;
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
      <h2 className="text-sm font-semibold text-brand-ink">
        Interlocuteurs{" "}
        <span className="font-normal text-brand-gray">
          (responsable qualité, production…)
        </span>
      </h2>

      {contacts.length === 0 ? (
        <p className="text-xs text-brand-gray">Aucun interlocuteur enregistré pour le moment.</p>
      ) : (
        <ul className="space-y-3">
          {contacts.map((c) => (
            <li key={c.id} className="rounded-lg border border-slate-200 p-3">
              <form action={updateContactAction} className="space-y-2">
                <input type="hidden" name="id" value={c.id} />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    name="prenom"
                    defaultValue={c.prenom}
                    required
                    placeholder="Prénom"
                    className="input text-xs"
                  />
                  <input
                    name="nom"
                    defaultValue={c.nom}
                    required
                    placeholder="Nom"
                    className="input text-xs"
                  />
                </div>
                <input
                  name="fonction"
                  defaultValue={c.fonction ?? ""}
                  placeholder="Fonction (ex. Responsable qualité)"
                  className="input text-xs"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    name="email"
                    type="email"
                    defaultValue={c.email ?? ""}
                    placeholder="Email"
                    className="input text-xs"
                  />
                  <input
                    name="telephone"
                    defaultValue={c.telephone ?? ""}
                    placeholder="Téléphone"
                    className="input text-xs"
                  />
                </div>
                <textarea
                  name="notes"
                  defaultValue={c.notes ?? ""}
                  rows={2}
                  placeholder="Notes"
                  className="input text-xs"
                />
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-1.5 text-xs text-brand-body">
                    <input
                      type="checkbox"
                      name="principal"
                      defaultChecked={c.principal}
                      className="h-3.5 w-3.5 rounded border-slate-300 text-brand-blue focus:ring-brand-blue"
                    />
                    Contact principal
                  </label>
                  <div className="flex gap-3">
                    <button type="submit" className="link-underline text-xs text-brand-blue-dark">
                      Enregistrer
                    </button>
                  </div>
                </div>
              </form>
              <form action={deleteContactAction} className="mt-1.5 text-right">
                <input type="hidden" name="id" value={c.id} />
                <button type="submit" className="link-underline text-xs text-red-600">
                  Supprimer ce contact
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}

      <form
        action={createContactAction}
        className="space-y-2 rounded-lg border border-dashed border-brand-blue-light/60 bg-brand-blue-bg-soft/40 p-3"
      >
        <input type="hidden" name="entrepriseId" value={entrepriseId} />
        <div className="grid grid-cols-2 gap-2">
          <input name="prenom" required placeholder="Prénom" className="input text-xs" />
          <input name="nom" required placeholder="Nom" className="input text-xs" />
        </div>
        <input
          name="fonction"
          placeholder="Fonction (ex. Responsable production)"
          className="input text-xs"
        />
        <div className="grid grid-cols-2 gap-2">
          <input name="email" type="email" placeholder="Email" className="input text-xs" />
          <input name="telephone" placeholder="Téléphone" className="input text-xs" />
        </div>
        <textarea name="notes" rows={2} placeholder="Notes" className="input text-xs" />
        <label className="flex items-center gap-1.5 text-xs text-brand-body">
          <input
            type="checkbox"
            name="principal"
            className="h-3.5 w-3.5 rounded border-slate-300 text-brand-blue focus:ring-brand-blue"
          />
          Contact principal
        </label>
        <button type="submit" className="btn btn-secondary w-full py-1.5 text-xs">
          + Ajouter un interlocuteur
        </button>
      </form>
    </div>
  );
}
