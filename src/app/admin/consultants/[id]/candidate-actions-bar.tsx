"use client";

import { useState } from "react";
import Link from "next/link";
import type { ConsultantPublic } from "@/lib/consultant-view";
import type { MatchResult } from "@/lib/matching";
import MatchBadges from "@/components/MatchBadges";
import ConsultantBrief from "@/components/consultant/ConsultantBrief";
import SuiviSection from "./suivi-section";
import PushCandidatForm from "./push-candidat-form";
import TaggingIaForm from "./tagging-ia-form";
import {
  publishConsultantAction,
  unpublishConsultantAction,
  purgeConsultantAction,
} from "../actions";

type Suivi = {
  id: string;
  type: string;
  titre: string;
  notes: string | null;
  dateProgrammee: Date | null;
  fait: boolean;
  createdAt: Date;
  createdBy: { name: string };
};

type Contact = { id: string; prenom: string; nom: string; email: string | null };
type EntrepriseOption = { id: string; nom: string; contacts: Contact[] };

type Proposition = {
  id: string;
  createdAt: Date;
  entreprise: { nom: string };
  contact: { prenom: string; nom: string } | null;
};

type Suggestion = { id: string; nom: string; match: MatchResult };

const TABS = [
  { key: "action", label: "Action" },
  { key: "push", label: "Push" },
  { key: "apercu", label: "Aperçu" },
  { key: "tagging", label: "Tagging IA" },
] as const;
type PopupKey = (typeof TABS)[number]["key"];

export default function CandidateActionsBar({
  consultantId,
  canDelete,
  suivis,
  entreprisesPourPush,
  propositions,
  suggestions,
  publicView,
}: {
  consultantId: string;
  canDelete: boolean;
  suivis: Suivi[];
  entreprisesPourPush: EntrepriseOption[];
  propositions: Proposition[];
  suggestions: Suggestion[];
  publicView: ConsultantPublic | null;
}) {
  const [open, setOpen] = useState<PopupKey | null>(null);

  function toggle(key: PopupKey) {
    setOpen((cur) => (cur === key ? null : key));
  }

  return (
    <>
      <div className="card flex flex-wrap items-center gap-2 p-3">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => toggle(t.key)}
            className={`btn ${open === t.key ? "btn-primary" : "btn-secondary"}`}
          >
            {t.label}
          </button>
        ))}

        <form action={publishConsultantAction}>
          <input type="hidden" name="id" value={consultantId} />
          <button type="submit" className="btn bg-brand-green text-white hover:brightness-110">
            Publier
          </button>
        </form>
        <form action={unpublishConsultantAction}>
          <input type="hidden" name="id" value={consultantId} />
          <button type="submit" className="btn btn-secondary">
            Dépublier
          </button>
        </form>

        {canDelete && (
          <form action={purgeConsultantAction} className="ml-auto">
            <input type="hidden" name="id" value={consultantId} />
            <button
              type="submit"
              className="btn border border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
            >
              Supprimer définitivement (RGPD)
            </button>
          </form>
        )}
      </div>

      {open && (
        <div className="fixed bottom-4 right-4 z-50 w-[min(92vw,420px)] max-h-[80vh] overflow-y-auto card p-4 shadow-xl">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-brand-ink">
              {TABS.find((t) => t.key === open)?.label}
            </h2>
            <button
              type="button"
              onClick={() => setOpen(null)}
              aria-label="Fermer"
              className="text-brand-gray hover:text-brand-ink"
            >
              ✕
            </button>
          </div>

          {open === "action" && <SuiviSection consultantId={consultantId} suivis={suivis} />}

          {open === "push" && (
            <div className="space-y-4">
              {entreprisesPourPush.length === 0 ? (
                <p className="text-xs text-brand-gray">
                  Aucune entreprise CRM accessible pour l&apos;instant.
                </p>
              ) : (
                <PushCandidatForm consultantId={consultantId} entreprises={entreprisesPourPush} />
              )}
              {propositions.length > 0 && (
                <ul className="space-y-1.5 border-t border-slate-100 pt-3 text-xs">
                  {propositions.map((p) => (
                    <li key={p.id} className="text-brand-body">
                      <span className="font-medium text-brand-ink">{p.entreprise.nom}</span>
                      {p.contact && ` — ${p.contact.prenom} ${p.contact.nom}`}
                      <span className="text-brand-gray">
                        {" "}
                        · {new Date(p.createdAt).toLocaleDateString("fr-FR")}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              {suggestions.length > 0 && (
                <div className="border-t border-slate-100 pt-3">
                  <h3 className="mb-1 text-xs font-semibold text-brand-ink">
                    Clients potentiellement intéressés
                  </h3>
                  <p className="mb-2 text-[11px] text-brand-gray">
                    Secteurs / expertises recherchés correspondant à ce profil.
                  </p>
                  <ul className="space-y-1.5">
                    {suggestions.map((e) => (
                      <li key={e.id}>
                        <Link
                          href={`/admin/crm/${e.id}`}
                          className="flex flex-col gap-1 rounded-lg border border-slate-100 px-2.5 py-1.5 text-xs hover:border-brand-blue-light hover:bg-brand-blue-bg-soft"
                        >
                          <span className="font-medium text-brand-ink">{e.nom}</span>
                          <MatchBadges match={e.match} />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {open === "apercu" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-brand-blue-bg px-2 py-0.5 text-xs font-medium text-brand-blue-dark">
                  anonymisé
                </span>
                <Link
                  href={`/admin/consultants/${consultantId}/apercu`}
                  className="link-underline text-xs text-brand-blue-dark"
                >
                  Plein écran
                </Link>
              </div>
              {publicView && <ConsultantBrief consultant={publicView} />}
            </div>
          )}

          {open === "tagging" && <TaggingIaForm consultantId={consultantId} />}
        </div>
      )}
    </>
  );
}
