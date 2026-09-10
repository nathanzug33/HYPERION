-- CreateTable
CREATE TABLE "TradingPortfolio" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "mode" TEXT NOT NULL DEFAULT 'PAPER',
    "capitalInitial" REAL NOT NULL DEFAULT 50,
    "cash" REAL NOT NULL DEFAULT 50,
    "realizedPnl" REAL NOT NULL DEFAULT 0,
    "highWaterMark" REAL NOT NULL DEFAULT 50,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "TradingPosition" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "portfolioId" TEXT NOT NULL,
    "asset" TEXT NOT NULL,
    "quantity" REAL NOT NULL,
    "entryPrice" REAL NOT NULL,
    "currentPrice" REAL NOT NULL,
    "exitPrice" REAL,
    "stopLoss" REAL,
    "takeProfit" REAL,
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "realizedPnl" REAL,
    "openedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" DATETIME,
    CONSTRAINT "TradingPosition_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "TradingPortfolio" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TradingSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "portfolioId" TEXT NOT NULL,
    "totalValue" REAL NOT NULL,
    "cash" REAL NOT NULL,
    "invested" REAL NOT NULL,
    "unrealizedPnl" REAL NOT NULL,
    "highWaterMark" REAL NOT NULL,
    "drawdownPct" REAL NOT NULL,
    "event" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TradingSnapshot_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "TradingPortfolio" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "TradingPosition_portfolioId_status_idx" ON "TradingPosition"("portfolioId", "status");

-- CreateIndex
CREATE INDEX "TradingSnapshot_portfolioId_createdAt_idx" ON "TradingSnapshot"("portfolioId", "createdAt");
