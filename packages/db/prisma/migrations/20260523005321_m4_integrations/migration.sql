-- CreateEnum
CREATE TYPE "IntakeKind" AS ENUM ('grafana', 'wordpress', 'generic');

-- AlterTable
ALTER TABLE "Issue" ADD COLUMN     "externalRef" TEXT,
ADD COLUMN     "intakeSourceId" TEXT;

-- CreateTable
CREATE TABLE "IntakeSource" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "IntakeKind" NOT NULL,
    "projectId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "defaultType" "IssueType" NOT NULL DEFAULT 'bug',
    "defaultPriority" "Priority" NOT NULL DEFAULT 'high',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntakeSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssignmentRule" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "matchType" "IssueType",
    "matchPriority" "Priority",
    "matchLabelId" TEXT,
    "assigneeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssignmentRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IntakeSource_tokenHash_key" ON "IntakeSource"("tokenHash");

-- CreateIndex
CREATE INDEX "IntakeSource_projectId_idx" ON "IntakeSource"("projectId");

-- CreateIndex
CREATE INDEX "AssignmentRule_projectId_idx" ON "AssignmentRule"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "Issue_intakeSourceId_externalRef_key" ON "Issue"("intakeSourceId", "externalRef");

-- AddForeignKey
ALTER TABLE "Issue" ADD CONSTRAINT "Issue_intakeSourceId_fkey" FOREIGN KEY ("intakeSourceId") REFERENCES "IntakeSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntakeSource" ADD CONSTRAINT "IntakeSource_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignmentRule" ADD CONSTRAINT "AssignmentRule_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignmentRule" ADD CONSTRAINT "AssignmentRule_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

