-- CreateEnum
CREATE TYPE "ProjectCadence" AS ENUM ('sprints', 'monthly');

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "cadence" "ProjectCadence" NOT NULL DEFAULT 'sprints';
