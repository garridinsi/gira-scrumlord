-- D2: reopen count (escaped-defect signal), additive with default 0
ALTER TABLE "Issue" ADD COLUMN "reopenCount" INTEGER NOT NULL DEFAULT 0;
