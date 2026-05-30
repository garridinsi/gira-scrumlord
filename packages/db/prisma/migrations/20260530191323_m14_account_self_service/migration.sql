-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_clientId_fkey";

-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "lastSeenAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "deactivatedAt" TIMESTAMP(3),
ADD COLUMN     "lastLoginAt" TIMESTAMP(3),
ADD COLUMN     "locale" TEXT NOT NULL DEFAULT 'es';

-- CreateTable
CREATE TABLE "EmailChangeToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "newEmail" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailChangeToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EmailChangeToken_tokenHash_key" ON "EmailChangeToken"("tokenHash");

-- CreateIndex
CREATE INDEX "EmailChangeToken_userId_idx" ON "EmailChangeToken"("userId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailChangeToken" ADD CONSTRAINT "EmailChangeToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Tenant-isolation invariants, now enforced at the DB level (previously app-only in
-- createUserSchema/updateUserSchema + the PATCH /users/:id guards). These make the
-- core multi-tenant guarantees unbreakable by any future code path or manual SQL.

-- (1) A client user MUST belong to a client; a staff user MUST NOT be scoped to one.
--     A NULL clientId on a client row would widen (not scope) portal visibility.
ALTER TABLE "User" ADD CONSTRAINT "User_kind_clientId_check"
  CHECK (("kind" = 'client' AND "clientId" IS NOT NULL) OR ("kind" = 'staff' AND "clientId" IS NULL));

-- (2) A client user is ALWAYS a read-only viewer — never admin/member on the staff surface.
ALTER TABLE "User" ADD CONSTRAINT "User_client_role_viewer_check"
  CHECK ("kind" <> 'client' OR "role" = 'viewer');
