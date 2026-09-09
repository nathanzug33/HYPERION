import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/guards";
import { canAccessEntreprise } from "@/lib/crm-access";
import {
  DUREE_ESTIMEE_OPTIONS,
  NATURE_CONTRAT_LABELS,
  STATUT_BESOIN,
  STATUT_BESOIN_LABELS,
  STATUT_BESOIN_CANDIDAT,
  STATUT_BESOIN_CANDIDAT_LABELS,
  type StatutBesoin,
  type StatutBesoinCandidat,
} from "@/lib/constants";
import {
  updateBesoinAction,
  marquerBesoinPerduAction,
  reouvrirBesoinAction,
  addBesoinCandidatAction,
  updateBesoinCandidatStatutAction,
  removeBesoinCandidatAction,
  marquerBesoinGagneAction,
} from "../actions";

export const dynamic = "force-dynamic";

const CANDIDAT_STATUT_STYLES: Record<string, string> = {
  PROPOSE: "bg-slate-100 text-brand-body",
  RDV_QUALIFICATION: "bg-brand-blue/15 text-brand-blue-dark",
  RETENU: "bg-brand-green/10 text-brand-green",
  ECARTE: "bg-red-50 text-red-600",
};

export default async function BesoinDetailPage({
  params,
}: {
  params: Promise<{ id: string; besoinId: string }>;
}) {
  const session = await requireStaff();
  const isAdmin = session.user.role === "ADMIN";
  const { id, besoinId } = await params;

  const besoin = await prisma.besoin.findUnique({
    where: { id: besoinId },
    include: {
      entreprise: true,
      contact: true,
      candidats: {
        include: { consultant: true, createdBy: true },
        orderBy: { createdAt: "asc" },
      },
      missions: true,
    },
  });

  if (!besoin || besoin.entrepriseId !== id) notFound();
  if (!canAccessEntreprise(session.user, besoin.entreprise)) redirect("/admin/crm");

  const [contacts, candidatsDisponibles] = await Promise.all([
    prisma.contact.findMany({ where: { entrepriseId: id }, orderBy: { nom: "asc" } }),
    prisma.consultant.findMany({
      where: { id: { notIn: besoin.candidats.map((c) => c.consultantId) } },
      orderBy: { nom: "asc" },
      select: { id: true, nom: true, prenom: true, referenceAnonyme: true },
    }),
  ]);

  const candidatsEligiblesGain = besoin.candidats.filter(
    (c) => c.statut !== STATUT_BESOIN_CANDIDAT.ECARTE
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-brand-ink">{besoin.intitulePoste}</h1>
          <p className="mt-1 text-sm text-brand-gray">
            <Link href={`/admin/crm/${id}`} className="link-underline text-brand-blue-dark">
              {besoin.entreprise.nom}
            </Link>
            {besoin.contact && ` — ${besoin.contact.prenom} ${besoin.contact.nom}`}
            {" · "}
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                besoin.statut === "GAGNE"
                  ? "bg-brand-green/10 text-brand-green"
                  : besoin.statut === "PERDU"
                    ? "bg-red-50 text-red-600"
                    : "bg-brand-blue/10 text-brand-blue-dark"
              }`}
            >
              {STATUT_BESOIN_LABELS[besoin.statut as StatutBesoin] ?? besoin.statut}
            </span>
          </p>
        </div>
        <Link
          href={`/admin/crm/${id}`}
          className="link-underline text-sm text-brand-gray hover:text-brand-ink"
        >
          ← Retour à {besoin.entreprise.nom}
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <form action={updateBesoinAction} className="card space-y-3 p-5">
            <input type="hidden" name="id" value={besoin.id} />
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-brand-body">
                  Intitulé du poste
                </label>
                <input
                  name="intitulePoste"
                  required
                  defaultValue={besoin.intitulePoste}
                  className="input mt-1.5"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-brand-body">Interlocuteur</label>
                <select
                  name="contactId"
                  defaultValue={besoin.contactId ?? ""}
                  className="input mt-1.5"
                >
                  <option value="">—</option>
                  {contacts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.prenom} {c.nom}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-brand-body">Séniorité</label>
                <input
                  name="seniorite"
                  defaultValue={besoin.seniorite ?? ""}
                  placeholder="Ex. Confirmé, Senior…"
                  className="input mt-1.5"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-brand-body">Localisation</label>
                <input
                  name="localisation"
                  defaultValue={besoin.localisation ?? ""}
                  className="input mt-1.5"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-brand-body">TJM min (€/j)</label>
                <input
                  type="number"
                  name="tjmCibleMin"
                  min={0}
                  defaultValue={besoin.tjmCibleMin ?? ""}
                  className="input mt-1.5"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-brand-body">TJM max (€/j)</label>
                <input
                  type="number"
                  name="tjmCibleMax"
                  min={0}
                  defaultValue={besoin.tjmCibleMax ?? ""}
                  className="input mt-1.5"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-brand-body">
                  Démarrage souhaité
                </label>
                <input
                  type="date"
                  name="dateDemarrageSouhaitee"
                  defaultValue={
                    besoin.dateDemarrageSouhaitee
                      ? besoin.dateDemarrageSouhaitee.toISOString().slice(0, 10)
                      : ""
                  }
                  className="input mt-1.5"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-brand-body">Durée estimée</label>
                <select
                  name="dureeEstimee"
                  defaultValue={besoin.dureeEstimee ?? ""}
                  className="input mt-1.5"
                >
                  <option value="">—</option>
                  {DUREE_ESTIMEE_OPTIONS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-brand-body">
                Missions (détail)
              </label>
              <textarea
                name="descriptifMissions"
                rows={4}
                defaultValue={besoin.descriptifMissions ?? ""}
                className="input mt-1.5"
              />
            </div>
            <button type="submit" className="btn btn-primary">
              Enregistrer
            </button>
          </form>

          <div className="card space-y-4 p-5">
            <h2 className="text-sm font-semibold text-brand-ink">
              Candidats associés{" "}
              <span className="font-normal text-brand-gray">
                — proposez des profils du vivier ATS, qualifiez-les, puis retenez le bon
              </span>
            </h2>

            {besoin.candidats.length === 0 ? (
              <p className="text-xs text-brand-gray">Aucun candidat associé pour l&apos;instant.</p>
            ) : (
              <ul className="-mx-2 divide-y divide-slate-100">
                {besoin.candidats.map((bc) => (
                  <li key={bc.id} className="flex flex-wrap items-center justify-between gap-2 px-2 py-2.5">
                    <div className="text-sm">
                      <Link
                        href={`/admin/consultants/${bc.consultantId}`}
                        className="font-medium text-brand-ink hover:text-brand-blue-dark"
                      >
                        {bc.consultant.prenom} {bc.consultant.nom}
                      </Link>{" "}
                      <span className="text-xs text-brand-gray">{bc.consultant.referenceAnonyme}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <form action={updateBesoinCandidatStatutAction} className="flex items-center gap-1">
                        <input type="hidden" name="id" value={bc.id} />
                        <select
                          name="statut"
                          defaultValue={bc.statut}
                          className={`rounded-full border-0 px-2 py-0.5 text-[10px] font-medium ${
                            CANDIDAT_STATUT_STYLES[bc.statut] ?? "bg-slate-100 text-brand-body"
                          }`}
                        >
                          {Object.values(STATUT_BESOIN_CANDIDAT).map((s) => (
                            <option key={s} value={s}>
                              {STATUT_BESOIN_CANDIDAT_LABELS[s as StatutBesoinCandidat]}
                            </option>
                          ))}
                        </select>
                        <button type="submit" className="link-underline text-xs text-brand-blue-dark">
                          OK
                        </button>
                      </form>
                      <form action={removeBesoinCandidatAction}>
                        <input type="hidden" name="id" value={bc.id} />
                        <button type="submit" className="link-underline text-xs text-red-600">
                          Retirer
                        </button>
                      </form>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {besoin.statut === STATUT_BESOIN.OUVERT && (
              <form
                action={addBesoinCandidatAction}
                className="flex flex-wrap items-end gap-2 rounded-lg border border-dashed border-brand-blue-light/60 bg-brand-blue-bg-soft/40 p-3"
              >
                <input type="hidden" name="besoinId" value={besoin.id} />
                <div className="flex-1">
                  <label className="block text-[11px] text-brand-gray">
                    Associer un candidat du vivier
                  </label>
                  <select name="consultantId" required defaultValue="" className="input text-xs">
                    <option value="" disabled>
                      — Choisir —
                    </option>
                    {candidatsDisponibles.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.prenom} {c.nom} ({c.referenceAnonyme})
                      </option>
                    ))}
                  </select>
                </div>
                <button type="submit" className="btn btn-secondary py-1.5 text-xs">
                  + Associer
                </button>
              </form>
            )}
          </div>
        </div>

        <div className="space-y-6">
          {besoin.statut === STATUT_BESOIN.OUVERT && (
            <div className="card space-y-3 p-5">
              <h2 className="text-sm font-semibold text-brand-ink">Gagner ce besoin</h2>
              {candidatsEligiblesGain.length === 0 ? (
                <p className="text-xs text-brand-gray">
                  Associez au moins un candidat avant de pouvoir gagner ce besoin.
                </p>
              ) : (
                <form action={marquerBesoinGagneAction} className="space-y-2">
                  <input type="hidden" name="besoinId" value={besoin.id} />
                  <div>
                    <label className="block text-[11px] text-brand-gray">Candidat retenu</label>
                    <select
                      name="besoinCandidatId"
                      required
                      defaultValue=""
                      className="input text-xs"
                    >
                      <option value="" disabled>
                        — Choisir —
                      </option>
                      {candidatsEligiblesGain.map((bc) => (
                        <option key={bc.id} value={bc.id}>
                          {bc.consultant.prenom} {bc.consultant.nom}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] text-brand-gray">TJM réel (€/j)</label>
                    <input type="number" name="tjm" min={0} className="input text-xs" />
                  </div>
                  <div>
                    <label className="block text-[11px] text-brand-gray">Date de début</label>
                    <input type="date" name="dateDebut" required className="input text-xs" />
                  </div>
                  <div>
                    <label className="block text-[11px] text-brand-gray">Fin prévue</label>
                    <input type="date" name="dateFinPrevue" className="input text-xs" />
                  </div>

                  {isAdmin ? (
                    <div className="space-y-2 rounded-lg border border-dashed border-brand-blue-light/60 bg-brand-blue-bg-soft/40 p-2.5">
                      <p className="text-[11px] font-medium text-brand-ink">
                        Coût / marge — sensible
                      </p>
                      <p className="text-[10px] text-brand-gray">
                        Nécessaire pour calculer la marge (CA &amp; Marge). Laissez un champ
                        vide pour ne pas modifier une valeur déjà enregistrée.
                      </p>
                      <div>
                        <label className="block text-[11px] text-brand-gray">
                          Nature du contrat
                        </label>
                        <select name="natureContrat" defaultValue="" className="input text-xs">
                          <option value="">— Ne pas modifier —</option>
                          {Object.entries(NATURE_CONTRAT_LABELS).map(([k, v]) => (
                            <option key={k} value={k}>
                              {v}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] text-brand-gray">
                          Salaire brut annuel (€) — si CDI / CDIC
                        </label>
                        <input
                          type="number"
                          name="salaireBrutAnnuel"
                          min={0}
                          className="input text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-brand-gray">
                          TJM payé (€/j) — si indépendant, sans coefficient
                        </label>
                        <input type="number" name="tjmAchat" min={0} className="input text-xs" />
                      </div>
                      <div>
                        <label className="block text-[11px] text-brand-gray">
                          Frais annuels (€) — IGD, IK…
                        </label>
                        <input
                          type="number"
                          name="fraisAnnuels"
                          min={0}
                          className="input text-xs"
                        />
                      </div>
                    </div>
                  ) : (
                    <p className="text-[10px] text-brand-gray">
                      Le calcul de marge nécessite que le salaire (ou le TJM indépendant) du
                      consultant soit renseigné par un administrateur.
                    </p>
                  )}

                  <button
                    type="submit"
                    className="btn w-full bg-brand-green py-2 text-white hover:brightness-110"
                  >
                    Marquer gagné — créer la mission
                  </button>
                </form>
              )}
              <form action={marquerBesoinPerduAction}>
                <input type="hidden" name="id" value={besoin.id} />
                <button
                  type="submit"
                  className="btn w-full border border-red-200 bg-red-50 py-2 text-red-700 hover:bg-red-100"
                >
                  Marquer perdu
                </button>
              </form>
            </div>
          )}

          {besoin.statut !== STATUT_BESOIN.OUVERT && (
            <div className="card space-y-3 p-5">
              {besoin.missions.length > 0 && (
                <div className="text-sm">
                  <p className="font-medium text-brand-ink">Mission créée</p>
                  <Link href="/admin/missions" className="link-underline text-brand-blue-dark">
                    Voir le portefeuille de missions
                  </Link>
                </div>
              )}
              <form action={reouvrirBesoinAction}>
                <input type="hidden" name="id" value={besoin.id} />
                <button type="submit" className="btn btn-secondary w-full py-2">
                  Réouvrir ce besoin
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
