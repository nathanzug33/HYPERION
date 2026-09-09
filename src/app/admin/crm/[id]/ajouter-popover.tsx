"use client";

import { useState } from "react";
import { DUREE_ESTIMEE_OPTIONS } from "@/lib/constants";
import { createContactAction } from "../actions";
import { createBesoinAction } from "./besoins/actions";

type Contact = { id: string; prenom: string; nom: string };

const TAB_LABELS = {
  contact: "Interlocuteur",
  besoin: "Besoin",
} as const;
type Tab = keyof typeof TAB_LABELS;

export default function AjouterPopover({
  entrepriseId,
  contacts,
}: {
  entrepriseId: string;
  contacts: Contact[];
}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("contact");

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="btn btn-secondary py-1.5 text-xs"
      >
        + Ajouter
      </button>

      {open && (
        <div className="fixed bottom-4 right-4 z-50 w-[min(92vw,380px)] card p-4 shadow-xl">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex gap-1 rounded-lg bg-slate-100 p-0.5 text-xs">
              {(Object.keys(TAB_LABELS) as Tab[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                    tab === t
                      ? "bg-white text-brand-ink shadow-sm"
                      : "text-brand-gray hover:text-brand-ink"
                  }`}
                >
                  {TAB_LABELS[t]}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Fermer"
              className="text-brand-gray hover:text-brand-ink"
            >
              ✕
            </button>
          </div>

          {tab === "contact" ? (
            <form
              action={createContactAction}
              onSubmit={() => setOpen(false)}
              className="space-y-2"
            >
              <input type="hidden" name="entrepriseId" value={entrepriseId} />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] text-brand-gray">Prénom</label>
                  <input name="prenom" required className="input text-xs" />
                </div>
                <div>
                  <label className="block text-[11px] text-brand-gray">Nom</label>
                  <input name="nom" required className="input text-xs" />
                </div>
              </div>
              <div>
                <label className="block text-[11px] text-brand-gray">Poste</label>
                <input
                  name="fonction"
                  placeholder="Ex. Responsable qualité"
                  className="input text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] text-brand-gray">Email</label>
                  <input name="email" type="email" className="input text-xs" />
                </div>
                <div>
                  <label className="block text-[11px] text-brand-gray">Téléphone</label>
                  <input name="telephone" className="input text-xs" />
                </div>
              </div>
              <button type="submit" className="btn btn-primary w-full py-1.5 text-xs">
                Ajouter l&apos;interlocuteur
              </button>
            </form>
          ) : (
            <form
              action={createBesoinAction}
              onSubmit={() => setOpen(false)}
              className="space-y-2"
            >
              <input type="hidden" name="entrepriseId" value={entrepriseId} />
              <div>
                <label className="block text-[11px] text-brand-gray">Intitulé du poste</label>
                <input
                  name="intitulePoste"
                  required
                  placeholder="Ex. Développeur backend Java"
                  className="input text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] text-brand-gray">Interlocuteur</label>
                  <select name="contactId" defaultValue="" className="input text-xs">
                    <option value="">—</option>
                    {contacts.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.prenom} {c.nom}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-brand-gray">Démarrage souhaité</label>
                  <input type="date" name="dateDemarrageSouhaitee" className="input text-xs" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] text-brand-gray">TJM min (€/j)</label>
                  <input type="number" name="tjmCibleMin" min={0} className="input text-xs" />
                </div>
                <div>
                  <label className="block text-[11px] text-brand-gray">TJM max (€/j)</label>
                  <input type="number" name="tjmCibleMax" min={0} className="input text-xs" />
                </div>
              </div>
              <div>
                <label className="block text-[11px] text-brand-gray">Durée estimée</label>
                <select name="dureeEstimee" defaultValue="" className="input text-xs">
                  <option value="">—</option>
                  {DUREE_ESTIMEE_OPTIONS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
              <button type="submit" className="btn btn-primary w-full py-1.5 text-xs">
                Ajouter le besoin
              </button>
            </form>
          )}
        </div>
      )}
    </>
  );
}
