-- N1: comment internal/client visibility (additive, default client so existing comments stay visible)
ALTER TABLE "Comment" ADD COLUMN "visibility" TEXT NOT NULL DEFAULT 'client';
