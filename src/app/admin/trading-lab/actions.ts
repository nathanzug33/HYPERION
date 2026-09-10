"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/guards";
import {
  getOrCreatePortfolio,
  computeMetrics,
  recordSnapshot,
  PROTECTION_LEVEL,
  TRADING_POSITION_STATUS,
} from "@/lib/trading-lab";

const PATH = "/admin/trading-lab";

function fail(code: string): never {
  redirect(`${PATH}?error=${code}`);
}

// §14 interdictions absolues : jamais de levier (une position ne peut être
// financée au-delà du cash disponible) et jamais de short (quantité > 0
// uniquement). §5 Niveau 3 / §6 Emergency Floor : plus aucune nouvelle
// position risquée sous la marge de sécurité.
export async function openPositionAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const portfolio = await getOrCreatePortfolio();

  const asset = String(formData.get("asset") ?? "").trim().toUpperCase();
  const quantity = Number(formData.get("quantity"));
  const entryPrice = Number(formData.get("entryPrice"));
  const stopLossRaw = formData.get("stopLoss");
  const stopLoss = stopLossRaw && String(stopLossRaw).trim() !== "" ? Number(stopLossRaw) : null;
  const reason = String(formData.get("reason") ?? "").trim() || null;

  if (!asset) fail("actif_requis");
  if (!Number.isFinite(quantity) || quantity <= 0) fail("quantite_invalide");
  if (!Number.isFinite(entryPrice) || entryPrice <= 0) fail("prix_invalide");
  if (stopLoss != null && (!Number.isFinite(stopLoss) || stopLoss <= 0)) fail("stop_loss_invalide");

  const openPositions = await prisma.tradingPosition.findMany({
    where: { portfolioId: portfolio.id, status: TRADING_POSITION_STATUS.OPEN },
  });
  const { protectionLevel } = computeMetrics(portfolio, openPositions);

  // §5 Niveau 3 : sous le Capital Floor, plus aucune nouvelle position
  // risquée. Le capital initial étant lui-même égal au Capital Floor, un
  // portefeuille neuf (100 % cash) n'est pas bloqué — seule une perte
  // réelle (portefeuille retombé sous 50 €) déclenche le blocage.
  if (protectionLevel === PROTECTION_LEVEL.CAPITAL_PROTECTION) {
    fail("capital_protection_mode");
  }

  const cost = quantity * entryPrice;
  if (cost > portfolio.cash) fail("cash_insuffisant");

  await prisma.$transaction([
    prisma.tradingPosition.create({
      data: {
        portfolioId: portfolio.id,
        asset,
        quantity,
        entryPrice,
        currentPrice: entryPrice,
        stopLoss,
        reason,
      },
    }),
    prisma.tradingPortfolio.update({
      where: { id: portfolio.id },
      data: { cash: portfolio.cash - cost },
    }),
  ]);

  await recordSnapshot(portfolio.id, "OUVERTURE");
  revalidatePath(PATH);
}

// Tient lieu de Market Engine (à venir §7-8) : en Phase 1, le dernier prix
// connu d'une position ouverte est saisi manuellement pour recalculer le
// P&L latent, le drawdown et le High Water Mark.
export async function updatePriceAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const positionId = String(formData.get("positionId") ?? "");
  const currentPrice = Number(formData.get("currentPrice"));

  const position = await prisma.tradingPosition.findUnique({ where: { id: positionId } });
  if (!position || position.status !== TRADING_POSITION_STATUS.OPEN) fail("position_introuvable");
  if (!Number.isFinite(currentPrice) || currentPrice <= 0) fail("prix_invalide");

  await prisma.tradingPosition.update({ where: { id: positionId }, data: { currentPrice } });
  await recordSnapshot(position.portfolioId, "MAJ_PRIX");
  revalidatePath(PATH);
}

export async function closePositionAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const positionId = String(formData.get("positionId") ?? "");
  const exitPrice = Number(formData.get("exitPrice"));

  const position = await prisma.tradingPosition.findUnique({ where: { id: positionId } });
  if (!position || position.status !== TRADING_POSITION_STATUS.OPEN) fail("position_introuvable");
  if (!Number.isFinite(exitPrice) || exitPrice <= 0) fail("prix_invalide");

  const portfolio = await prisma.tradingPortfolio.findUniqueOrThrow({
    where: { id: position.portfolioId },
  });
  const realizedPnl = position.quantity * (exitPrice - position.entryPrice);
  const proceeds = position.quantity * exitPrice;

  await prisma.$transaction([
    prisma.tradingPosition.update({
      where: { id: positionId },
      data: {
        status: TRADING_POSITION_STATUS.CLOSED,
        exitPrice,
        realizedPnl,
        closedAt: new Date(),
      },
    }),
    prisma.tradingPortfolio.update({
      where: { id: position.portfolioId },
      data: {
        cash: portfolio.cash + proceeds,
        realizedPnl: portfolio.realizedPnl + realizedPnl,
      },
    }),
  ]);

  await recordSnapshot(position.portfolioId, "CLOTURE");
  revalidatePath(PATH);
}
