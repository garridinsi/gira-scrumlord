-- m34: annex numbers are assigned only when an annex becomes definitive (issued), so a
-- draft carries no number. Make Invoice.number nullable. The UNIQUE index is unaffected —
-- Postgres treats NULLs as distinct, so multiple unnumbered drafts coexist.
ALTER TABLE "Invoice" ALTER COLUMN "number" DROP NOT NULL;
