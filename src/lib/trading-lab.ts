import { prisma } from "@/lib/prisma";
import type { TradingPortfolio, TradingPosition } from "@prisma/client";

// AI Trading Lab — agent autonome de gestion d'un portefeuille (cahier des
// charges dédié, séparé du domaine ATS/CRM du reste de l'application).
// Phase 1 de la roadmap (§42) : dashboard + portefeuille virtuel (paper
// trading, §29). Aucun Market/AI/Execution Engine n'est encore branché —
// les positions sont saisies manuellement par un administrateur, à la place
// de ces moteurs à venir dans les phases suivantes.

export const TRADING_MODE = { PAPER: "PAPER" } as const;

export const TRADING_POSITION_STATUS = { OPEN: "OPEN", CLOSED: "CLOSED" } as const;

// §4 : le capital protégé de référence est égal au capital initial.
export const CAPITAL_INITIAL = 50;
// §15 Niveau 3 : sous ce seuil, Capital Protection Mode.
export const CAPITAL_FLOOR = 50;
// §6 : marge de sécurité au-dessus du Capital Floor théorique — l'agent
// réduit déjà son exposition avant d'atteindre effectivement 50 €.
export const EMERGENCY_FLOOR = 51;
// §5 Niveau 1 : surveillance renforcée en dessous de ce seuil.
export const SURVEILLANCE_THRESHOLD = 55;
// §19 : au-delà de ce drawdown vs High Water Mark, risque fortement réduit.
export const RISK_REDUCTION_DRAWDOWN_PCT = 10;

export const PROTECTION_LEVEL = {
  NORMAL: "NORMAL",
  SURVEILLANCE: "SURVEILLANCE",
  RISK_REDUCTION: "RISK_REDUCTION",
  CAPITAL_PROTECTION: "CAPITAL_PROTECTION",
} as const;
export type ProtectionLevel = (typeof PROTECTION_LEVEL)[keyof typeof PROTECTION_LEVEL];

export const PROTECTION_LEVEL_LABELS: Record<ProtectionLevel, string> = {
  NORMAL: "Normal",
  SURVEILLANCE: "Surveillance renforcée",
  RISK_REDUCTION: "Réduction du risque",
  CAPITAL_PROTECTION: "Capital Protection Mode",
};

/** Portefeuille singleton de l'agent (un seul agent, un seul capital pour
 * l'instant). Créé au premier accès avec le capital initial de 50 €. */
export async function getOrCreatePortfolio(): Promise<TradingPortfolio> {
  const existing = await prisma.tradingPortfolio.findFirst();
  if (existing) return existing;

  const portfolio = await prisma.tradingPortfolio.create({
    data: {
      capitalInitial: CAPITAL_INITIAL,
      cash: CAPITAL_INITIAL,
      highWaterMark: CAPITAL_INITIAL,
    },
  });
  await prisma.tradingSnapshot.create({
    data: {
      portfolioId: portfolio.id,
      totalValue: CAPITAL_INITIAL,
      cash: CAPITAL_INITIAL,
      invested: 0,
      unrealizedPnl: 0,
      highWaterMark: CAPITAL_INITIAL,
      drawdownPct: 0,
      event: "INITIAL",
    },
  });
  return portfolio;
}

export interface PortfolioMetrics {
  invested: number;
  unrealizedPnl: number;
  totalValue: number;
  performancePct: number;
  drawdownPct: number;
  protectionLevel: ProtectionLevel;
}

/** Calcule les métriques dérivées (§4, §18-19) à partir du portefeuille et
 * de ses positions ouvertes. Pure fonction — aucun accès base ici. */
export function computeMetrics(
  portfolio: Pick<TradingPortfolio, "cash" | "capitalInitial" | "highWaterMark">,
  openPositions: Pick<TradingPosition, "quantity" | "entryPrice" | "currentPrice">[],
): PortfolioMetrics {
  const invested = openPositions.reduce((sum, p) => sum + p.quantity * p.currentPrice, 0);
  const unrealizedPnl = openPositions.reduce(
    (sum, p) => sum + p.quantity * (p.currentPrice - p.entryPrice),
    0,
  );
  const totalValue = portfolio.cash + invested;
  const performancePct =
    portfolio.capitalInitial > 0
      ? ((totalValue - portfolio.capitalInitial) / portfolio.capitalInitial) * 100
      : 0;

  const highWaterMark = Math.max(portfolio.highWaterMark, totalValue);
  const drawdownPct = highWaterMark > 0 ? ((highWaterMark - totalValue) / highWaterMark) * 100 : 0;

  // Strictement inférieur au floor : le capital initial est lui-même égal
  // au Capital Floor (§4), donc un portefeuille neuf (100 % cash, aucune
  // perte) ne doit pas se retrouver bloqué en Capital Protection Mode dès
  // le départ.
  let protectionLevel: ProtectionLevel = PROTECTION_LEVEL.NORMAL;
  if (totalValue < CAPITAL_FLOOR) {
    protectionLevel = PROTECTION_LEVEL.CAPITAL_PROTECTION;
  } else if (drawdownPct >= RISK_REDUCTION_DRAWDOWN_PCT) {
    protectionLevel = PROTECTION_LEVEL.RISK_REDUCTION;
  } else if (totalValue < SURVEILLANCE_THRESHOLD) {
    protectionLevel = PROTECTION_LEVEL.SURVEILLANCE;
  }

  return { invested, unrealizedPnl, totalValue, performancePct, drawdownPct, protectionLevel };
}

/** Recalcule les métriques du portefeuille, met à jour le High Water Mark
 * si dépassé (§18) et journalise un instantané (§25-26). À appeler après
 * toute mutation (ouverture, clôture, mise à jour de prix). */
export async function recordSnapshot(portfolioId: string, event: string): Promise<void> {
  const [portfolio, openPositions] = await Promise.all([
    prisma.tradingPortfolio.findUniqueOrThrow({ where: { id: portfolioId } }),
    prisma.tradingPosition.findMany({
      where: { portfolioId, status: TRADING_POSITION_STATUS.OPEN },
    }),
  ]);

  const metrics = computeMetrics(portfolio, openPositions);
  const highWaterMark = Math.max(portfolio.highWaterMark, metrics.totalValue);
  if (highWaterMark !== portfolio.highWaterMark) {
    await prisma.tradingPortfolio.update({ where: { id: portfolioId }, data: { highWaterMark } });
  }

  await prisma.tradingSnapshot.create({
    data: {
      portfolioId,
      totalValue: metrics.totalValue,
      cash: portfolio.cash,
      invested: metrics.invested,
      unrealizedPnl: metrics.unrealizedPnl,
      highWaterMark,
      drawdownPct: metrics.drawdownPct,
      event,
    },
  });
}
