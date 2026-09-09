import Link from "next/link";
import { STATUT_BESOIN_LABELS, type StatutBesoin } from "@/lib/constants";

type Contact = { id: string; prenom: string; nom: string };

type Besoin = {
  id: string;
  intitulePoste: string;
  statut: string;
  tjmCibleMin: number | null;
  tjmCibleMax: number | null;
  dateDemarrageSouhaitee: Date | null;
  contact: Contact | null;
  missions: { id: string }[];
};

const STATUT_STYLES: Record<string, string> = {
  OUVERT: "bg-brand-blue/10 text-brand-blue-dark",
  GAGNE: "bg-brand-green/10 text-brand-green",
  PERDU: "bg-red-50 text-red-600",
  ABANDONNE: "bg-slate-100 text-brand-gray",
};

export default function BesoinsSection({
  entrepriseId,
  besoins,
}: {
  entrepriseId: string;
  besoins: Besoin[];
}) {
  return (
    <div className="card space-y-3 p-5">
      <h2 className="text-sm font-semibold text-brand-ink">
        Besoins {besoins.length > 0 && `(${besoins.length})`}
      </h2>

      {besoins.length === 0 ? (
        <p className="text-xs text-brand-gray">Aucun besoin enregistré pour le moment.</p>
      ) : (
        <ul className="-mx-2 max-h-[420px] divide-y divide-slate-100 overflow-y-auto">
          {besoins.map((b) => (
            <li
              key={b.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg px-2 py-2.5 transition-colors hover:bg-brand-blue-bg-soft"
            >
              <div className="text-sm">
                <span className="font-medium text-brand-ink">{b.intitulePoste}</span>
                {b.contact && (
                  <span className="text-brand-gray">
                    {" "}
                    — {b.contact.prenom} {b.contact.nom}
                  </span>
                )}
                {(b.tjmCibleMin || b.tjmCibleMax) && (
                  <span className="text-brand-gray">
                    {" "}
                    · {b.tjmCibleMin ?? "?"}–{b.tjmCibleMax ?? "?"} €/j
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    STATUT_STYLES[b.statut] ?? "bg-slate-100 text-brand-gray"
                  }`}
                >
                  {STATUT_BESOIN_LABELS[b.statut as StatutBesoin] ?? b.statut}
                </span>
                <Link
                  href={`/admin/crm/${entrepriseId}/besoins/${b.id}`}
                  className="link-underline text-xs text-brand-blue-dark"
                >
                  Ouvrir
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
