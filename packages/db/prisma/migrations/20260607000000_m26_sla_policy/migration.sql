-- B2: per-project (optionally per-priority) SLA targets (additive — new table)
CREATE TABLE "SlaPolicy" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "priority" TEXT,
    "responseMinutes" INTEGER NOT NULL,
    "resolutionMinutes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SlaPolicy_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "SlaPolicy_projectId_priority_key" ON "SlaPolicy"("projectId", "priority");
CREATE INDEX "SlaPolicy_projectId_idx" ON "SlaPolicy"("projectId");
ALTER TABLE "SlaPolicy" ADD CONSTRAINT "SlaPolicy_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
