-- m33: per-issue "covered" billing mode (work covered by an agreement, tracked but never billed).
-- Additive enum value. Postgres allows ADD VALUE in a transaction (PG 12+) as long as the new
-- value is not used in the same transaction; Prisma runs each migration in its own transaction,
-- so this is safe and non-blocking.
ALTER TYPE "BillingMode" ADD VALUE IF NOT EXISTS 'covered';
