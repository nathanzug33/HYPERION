import type { Contact } from "@prisma/client";
import { updateContactAction, deleteContactAction } from "../../../actions";

export default function ContactEditForm({ contact }: { contact: Contact }) {
  return (
    <div className="card space-y-4 p-5">
      <form action={updateContactAction} className="space-y-3">
        <input type="hidden" name="id" value={contact.id} />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-brand-body">Prénom</label>
            <input name="prenom" defaultValue={contact.prenom} required className="input mt-1.5" />
          </div>
          <div>
            <label className="block text-xs font-medium text-brand-body">Nom</label>
            <input name="nom" defaultValue={contact.nom} required className="input mt-1.5" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-brand-body">Poste</label>
          <input
            name="fonction"
            defaultValue={contact.fonction ?? ""}
            placeholder="Ex. Responsable qualité"
            className="input mt-1.5"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-brand-body">Email</label>
            <input
              name="email"
              type="email"
              defaultValue={contact.email ?? ""}
              className="input mt-1.5"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-brand-body">Téléphone</label>
            <input name="telephone" defaultValue={contact.telephone ?? ""} className="input mt-1.5" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-brand-body">Notes</label>
          <textarea
            name="notes"
            defaultValue={contact.notes ?? ""}
            rows={3}
            className="input mt-1.5"
          />
        </div>
        <label className="flex items-center gap-1.5 text-sm text-brand-body">
          <input
            type="checkbox"
            name="principal"
            defaultChecked={contact.principal}
            className="h-4 w-4 rounded border-slate-300 text-brand-blue focus:ring-brand-blue"
          />
          Contact principal de l&apos;entreprise
        </label>
        <button type="submit" className="btn btn-primary px-6 py-2">
          Enregistrer
        </button>
      </form>

      <form action={deleteContactAction} className="border-t border-slate-100 pt-3 text-right">
        <input type="hidden" name="id" value={contact.id} />
        <button type="submit" className="link-underline text-sm text-red-600">
          Supprimer cet interlocuteur
        </button>
      </form>
    </div>
  );
}
