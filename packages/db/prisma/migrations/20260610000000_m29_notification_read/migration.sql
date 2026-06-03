-- E1: in-app inbox — mark when a personal notification was read + index the inbox query.
ALTER TABLE "Notification" ADD COLUMN "readAt" TIMESTAMP(3);
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");
