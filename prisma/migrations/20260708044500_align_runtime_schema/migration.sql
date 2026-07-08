ALTER TYPE "CredentialType" ADD VALUE IF NOT EXISTS 'CPR';

ALTER TABLE "companies"
ADD COLUMN IF NOT EXISTS "kakaoOpenChatUrl" TEXT;

ALTER TABLE "sos_matches"
ADD COLUMN IF NOT EXISTS "missionReportedAt" TIMESTAMP(3);

ALTER TABLE "sos_requests"
ADD COLUMN IF NOT EXISTS "dressCode" TEXT,
ADD COLUMN IF NOT EXISTS "dressCodeNote" TEXT,
ADD COLUMN IF NOT EXISTS "siteManagerContact" TEXT;

ALTER TABLE "worker_profiles"
ADD COLUMN IF NOT EXISTS "declaredCredentials" "CredentialType"[] DEFAULT ARRAY[]::"CredentialType"[],
ADD COLUMN IF NOT EXISTS "height" INTEGER,
ADD COLUMN IF NOT EXISTS "profileImageUrl" TEXT,
ADD COLUMN IF NOT EXISTS "weight" INTEGER;

CREATE TABLE IF NOT EXISTS "point_accounts" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "balance" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "point_accounts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "point_transactions" (
  "id" TEXT NOT NULL,
  "accountId" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "type" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "sosRequestId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "point_transactions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "point_accounts_userId_key" ON "point_accounts"("userId");
CREATE INDEX IF NOT EXISTS "point_transactions_accountId_idx" ON "point_transactions"("accountId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'point_accounts_userId_fkey'
  ) THEN
    ALTER TABLE "point_accounts"
    ADD CONSTRAINT "point_accounts_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'point_transactions_accountId_fkey'
  ) THEN
    ALTER TABLE "point_transactions"
    ADD CONSTRAINT "point_transactions_accountId_fkey"
    FOREIGN KEY ("accountId") REFERENCES "point_accounts"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
