-- P1: per-client frozen billing month (additive — new table)
CREATE TABLE "PeriodLock" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "monthKey" TEXT NOT NULL,
    "lockedById" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PeriodLock_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PeriodLock_clientId_monthKey_key" ON "PeriodLock"("clientId", "monthKey");
CREATE INDEX "PeriodLock_clientId_idx" ON "PeriodLock"("clientId");
ALTER TABLE "PeriodLock" ADD CONSTRAINT "PeriodLock_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
