-- D1: first-class Blocked — non-null reason marks the issue blocked (additive, nullable)
ALTER TABLE "Issue" ADD COLUMN "blockedReason" TEXT;
