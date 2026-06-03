-- Q1: internal runbook / KB article (additive — new table)
CREATE TABLE "KbArticle" (
    "id" TEXT NOT NULL,
    "clientId" TEXT,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL DEFAULT '',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "KbArticle_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "KbArticle_clientId_idx" ON "KbArticle"("clientId");
ALTER TABLE "KbArticle" ADD CONSTRAINT "KbArticle_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
