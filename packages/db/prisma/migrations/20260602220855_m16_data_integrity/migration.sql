-- DropForeignKey
ALTER TABLE "Invoice" DROP CONSTRAINT "Invoice_clientId_fkey";

-- DropForeignKey
ALTER TABLE "Project" DROP CONSTRAINT "Project_clientId_fkey";

-- CreateIndex
CREATE INDEX "Worklog_loggedAt_idx" ON "Worklog"("loggedAt");

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- The global fallback (default-scope) rate must be unique and deterministic. The POST
-- /rates handler was a read-then-create, so two concurrent default-rate creates could
-- both insert, and resolvers then pick an arbitrary one via findFirst. First collapse
-- any pre-existing duplicates (keep the most recently updated, tie-break on id), then
-- enforce one-default-rate with a partial unique index (not expressible in the Prisma
-- schema — same pattern as User_email_lower_key).
DELETE FROM "Rate" a
  USING "Rate" b
  WHERE a."scope" = 'default' AND b."scope" = 'default'
    AND (a."updatedAt" < b."updatedAt"
         OR (a."updatedAt" = b."updatedAt" AND a."id" < b."id"));

CREATE UNIQUE INDEX "Rate_one_default" ON "Rate" ("scope") WHERE "scope" = 'default';
