import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/guards";
import {
  getOrCreatePortfolio,
  computeMetrics,
  CAPITAL_FLOOR,
  EMERGENCY_FLOOR,
  PROTECTION_LEVEL,
  PROTECTION_LEVEL_LABELS,
  TRADING_POSITION_STATUS,
  type ProtectionLevel,
} from "@/lib/trading-lab";
import { openPositionAction, updatePriceAction, closePositionAction } from "./actions";

export const dynamic = "force-dynamic";

const ERROR_LABELS: Record<string, string> = {
  actif_requis: "L'actif est obligatoire.",
  quantite_invalide: "La quantité doit être un nombre positif.",
  prix_invalide: "Le prix doit être un nombre positif.",
  stop_loss_invalide: "Le stop loss doit être un nombre positif.",
  cash_insuffisant: "Cash disponible insuffisant pour ouvrir cette position (pas de levier — §14).",
  capital_protection_mode:
    "Le portefeuille est en Capital Protection Mode (valeur sous le Capital Floor de 50 €) : aucune nouvelle position risquée n'est autorisée (§5).",
  position_introuvable: "Position introuvable ou déjà clôturée.",
};

const PROTECTION_BADGE_STYLES: Record<ProtectionLevel, string> = {
  NORMAL: "bg-brand-green-light text-brand-green",
  SURVEILLANCE: "bg-amber-50 text-amber-700",
  RISK_REDUCTION: "bg-orange-50 text-orange-700",
  CAPITAL_PROTECTION: "bg-red-50 text-red-700",
};

function euros(n: number): string {
  return `${n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
}

function pct(n: number): string {
  return `${n >= 0 ? "+" : ""}${n.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`;
}

export default async function TradingLabPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireAdmin();
  const { error } = await searchParams;

  const portfolio = await getOrCreatePortfolio();
  const [openPositions, closedPositions] = await Promise.all([
    prisma.tradingPosition.findMany({
      where: { portfolioId: portfolio.id, status: TRADING_POSITION_STATUS.OPEN },
      orderBy: { openedAt: "desc" },
    }),
    prisma.tradingPosition.findMany({
      where: { portfolioId: portfolio.id, status: TRADING_POSITION_STATUS.CLOSED },
      orderBy: { closedAt: "desc" },
      take: 20,
    }),
  ]);

  const metrics = computeMetrics(portfolio, openPositions);
  const canOpenPosition = metrics.protectionLevel !== PROTECTION_LEVEL.CAPITAL_PROTECTION;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-brand-ink">AI Trading Lab</h1>
        <p className="mt-1 text-sm text-brand-gray">
          Agent autonome de gestion de portefeuille — Phase 1 : dashboard + portefeuille virtuel
          (paper trading). Aucun argent réel, aucune donnée de marché branchée : les positions sont
          saisies manuellement pour l&apos;instant.
        </p>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        Le Capital Floor de {euros(CAPITAL_FLOOR)} est un objectif de protection et non une
        garantie financière (§6). Le marché peut provoquer slippage, gap, erreur API ou perte
        supérieure au stop théorique. Marge de sécurité (Emergency Floor) : {euros(EMERGENCY_FLOOR)}.
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {ERROR_LABELS[error] ?? "Une erreur est survenue."}
        </div>
      )}

      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-brand-ink">Niveau de protection :</span>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${PROTECTION_BADGE_STYLES[metrics.protectionLevel]}`}
        >
          {PROTECTION_LEVEL_LABELS[metrics.protectionLevel]}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
        <div className="card p-4">
          <div className="text-2xl font-semibold text-brand-ink">{euros(portfolio.capitalInitial)}</div>
          <div className="mt-1 text-xs text-brand-gray">Capital initial</div>
        </div>
        <div className="card p-4">
          <div className="text-2xl font-semibold text-brand-ink">{euros(metrics.totalValue)}</div>
          <div className="mt-1 text-xs text-brand-gray">Valeur portefeuille</div>
        </div>
        <div className="card p-4">
          <div
            className={`text-2xl font-semibold ${metrics.performancePct < 0 ? "text-red-600" : "text-brand-green"}`}
          >
            {pct(metrics.performancePct)}
          </div>
          <div className="mt-1 text-xs text-brand-gray">Performance</div>
        </div>
        <div className="card p-4">
          <div
            className={`text-2xl font-semibold ${portfolio.realizedPnl < 0 ? "text-red-600" : "text-brand-ink"}`}
          >
            {euros(portfolio.realizedPnl)}
          </div>
          <div className="mt-1 text-xs text-brand-gray">Gain réalisé</div>
        </div>
        <div className="card p-4">
          <div
            className={`text-2xl font-semibold ${metrics.unrealizedPnl < 0 ? "text-red-600" : "text-brand-ink"}`}
          >
            {euros(metrics.unrealizedPnl)}
          </div>
          <div className="mt-1 text-xs text-brand-gray">Gain latent</div>
        </div>
        <div className="card p-4">
          <div className={`text-2xl font-semibold ${metrics.drawdownPct > 0 ? "text-red-600" : "text-brand-ink"}`}>
            {metrics.drawdownPct.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %
          </div>
          <div className="mt-1 text-xs text-brand-gray">Drawdown</div>
        </div>
        <div className="card p-4">
          <div className="text-2xl font-semibold text-brand-ink">{euros(portfolio.highWaterMark)}</div>
          <div className="mt-1 text-xs text-brand-gray">High Water Mark</div>
        </div>
        <div className="card p-4">
          <div className="text-2xl font-semibold text-brand-ink">{euros(portfolio.cash)}</div>
          <div className="mt-1 text-xs text-brand-gray">Cash</div>
        </div>
        <div className="card p-4">
          <div className="text-2xl font-semibold text-brand-ink">{euros(metrics.invested)}</div>
          <div className="mt-1 text-xs text-brand-gray">Investi</div>
        </div>
      </div>

      <div className="card overflow-x-auto p-0">
        <div className="flex items-center justify-between p-5 pb-0">
          <h2 className="text-sm font-semibold text-brand-ink">Positions ouvertes</h2>
        </div>
        {openPositions.length === 0 ? (
          <p className="p-5 text-sm text-brand-gray">
            Aucune position ouverte — cash intégral. C&apos;est une décision valide (§15).
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-brand-gray">
              <tr>
                <th className="px-4 py-3">Actif</th>
                <th className="px-4 py-3">Quantité</th>
                <th className="px-4 py-3">Prix d&apos;entrée</th>
                <th className="px-4 py-3">Prix actuel</th>
                <th className="px-4 py-3">P&amp;L latent</th>
                <th className="px-4 py-3">Ouverte le</th>
                <th className="px-4 py-3">Raison</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {openPositions.map((p) => {
                const pnl = p.quantity * (p.currentPrice - p.entryPrice);
                return (
                  <tr key={p.id}>
                    <td className="px-4 py-2.5 font-medium text-brand-ink">{p.asset}</td>
                    <td className="px-4 py-2.5 text-brand-body">{p.quantity}</td>
                    <td className="px-4 py-2.5 text-brand-body">{euros(p.entryPrice)}</td>
                    <td className="px-4 py-2.5 text-brand-body">{euros(p.currentPrice)}</td>
                    <td className={`px-4 py-2.5 ${pnl < 0 ? "text-red-600" : "text-brand-green"}`}>
                      {euros(pnl)}
                    </td>
                    <td className="px-4 py-2.5 text-brand-body">
                      {p.openedAt.toLocaleDateString("fr-FR")}
                    </td>
                    <td className="max-w-[220px] truncate px-4 py-2.5 text-brand-gray" title={p.reason ?? ""}>
                      {p.reason ?? "—"}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex justify-end gap-2">
                        <form action={updatePriceAction} className="flex items-center gap-1">
                          <input type="hidden" name="positionId" value={p.id} />
                          <input
                            type="number"
                            step="any"
                            min="0"
                            name="currentPrice"
                            placeholder="Nouveau prix"
                            required
                            className="input w-28 py-1 text-xs"
                          />
                          <button type="submit" className="btn btn-secondary py-1 text-xs">
                            MAJ prix
                          </button>
                        </form>
                        <form action={closePositionAction} className="flex items-center gap-1">
                          <input type="hidden" name="positionId" value={p.id} />
                          <input
                            type="number"
                            step="any"
                            min="0"
                            name="exitPrice"
                            placeholder="Prix de sortie"
                            required
                            className="input w-28 py-1 text-xs"
                          />
                          <button type="submit" className="btn py-1 text-xs">
                            Clôturer
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="card p-5">
        <h2 className="mb-4 text-sm font-semibold text-brand-ink">Nouvelle position (saisie manuelle)</h2>
        {canOpenPosition ? (
          <form action={openPositionAction} className="flex flex-wrap items-end gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-brand-gray">Actif</label>
              <input
                type="text"
                name="asset"
                placeholder="BTC-EUR"
                required
                className="input w-32"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-brand-gray">Quantité</label>
              <input type="number" step="any" min="0" name="quantity" required className="input w-28" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-brand-gray">Prix d&apos;entrée</label>
              <input type="number" step="any" min="0" name="entryPrice" required className="input w-28" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-brand-gray">Stop loss (optionnel)</label>
              <input type="number" step="any" min="0" name="stopLoss" className="input w-28" />
            </div>
            <div className="min-w-[220px] flex-1">
              <label className="mb-1 block text-xs font-medium text-brand-gray">Raison</label>
              <input type="text" name="reason" placeholder="Momentum positif + volume croissant…" className="input w-full" />
            </div>
            <button type="submit" className="btn">
              Ouvrir la position
            </button>
          </form>
        ) : (
          <p className="text-sm text-red-700">
            Capital Protection Mode actif : ouverture de nouvelles positions suspendue (§5 Niveau 3).
          </p>
        )}
      </div>

      <div className="card overflow-x-auto p-0">
        <div className="p-5 pb-0">
          <h2 className="text-sm font-semibold text-brand-ink">Positions clôturées (20 dernières)</h2>
        </div>
        {closedPositions.length === 0 ? (
          <p className="p-5 text-sm text-brand-gray">Aucune position clôturée pour l&apos;instant.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-brand-gray">
              <tr>
                <th className="px-4 py-3">Actif</th>
                <th className="px-4 py-3">Quantité</th>
                <th className="px-4 py-3">Entrée</th>
                <th className="px-4 py-3">Sortie</th>
                <th className="px-4 py-3">P&amp;L réalisé</th>
                <th className="px-4 py-3">Clôturée le</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {closedPositions.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-2.5 font-medium text-brand-ink">{p.asset}</td>
                  <td className="px-4 py-2.5 text-brand-body">{p.quantity}</td>
                  <td className="px-4 py-2.5 text-brand-body">{euros(p.entryPrice)}</td>
                  <td className="px-4 py-2.5 text-brand-body">{p.exitPrice != null ? euros(p.exitPrice) : "—"}</td>
                  <td
                    className={`px-4 py-2.5 ${(p.realizedPnl ?? 0) < 0 ? "text-red-600" : "text-brand-green"}`}
                  >
                    {euros(p.realizedPnl ?? 0)}
                  </td>
                  <td className="px-4 py-2.5 text-brand-body">
                    {p.closedAt ? p.closedAt.toLocaleDateString("fr-FR") : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
