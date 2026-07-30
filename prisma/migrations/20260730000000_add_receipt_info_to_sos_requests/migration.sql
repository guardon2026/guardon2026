ALTER TABLE "sos_requests"
ADD COLUMN IF NOT EXISTS "receiptInfo" JSONB;
