-- E1 slice: make notification re-dispatch idempotent + record personal deliveries.
-- channelId becomes nullable (personal deliveries have no channel); add userId + outboxId.
ALTER TABLE "Notification" ALTER COLUMN "channelId" DROP NOT NULL;
ALTER TABLE "Notification" ADD COLUMN "userId" TEXT;
ALTER TABLE "Notification" ADD COLUMN "outboxId" TEXT;
CREATE INDEX "Notification_outboxId_idx" ON "Notification"("outboxId");
