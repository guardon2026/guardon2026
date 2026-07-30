-- 스키마 드리프트 복구: schema.prisma 에는 정의됐지만 마이그레이션이 누락되어
-- 실제 DB에 존재하지 않던 컬럼·테이블을 추가한다.

-- worker_profiles: 본인 인증(rrn) + 계좌 인증(bank*) 컬럼 누락
ALTER TABLE "worker_profiles"
ADD COLUMN IF NOT EXISTS "rrn" TEXT,
ADD COLUMN IF NOT EXISTS "rrnVerifiedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "bankName" TEXT,
ADD COLUMN IF NOT EXISTS "bankAccount" TEXT,
ADD COLUMN IF NOT EXISTS "bankHolder" TEXT,
ADD COLUMN IF NOT EXISTS "bankVerifiedAt" TIMESTAMP(3);

-- point_transactions: 영수증 정보 + 세금계산 완료 여부 컬럼 누락
ALTER TABLE "point_transactions"
ADD COLUMN IF NOT EXISTS "receiptInfo" JSONB,
ADD COLUMN IF NOT EXISTS "taxCompleted" BOOLEAN NOT NULL DEFAULT false;

-- work_contracts: 테이블 자체가 어떤 마이그레이션에도 생성된 적 없음
CREATE TABLE IF NOT EXISTS "work_contracts" (
  "id" TEXT NOT NULL,
  "sosRequestId" TEXT NOT NULL,
  "sosMatchId" TEXT NOT NULL,
  "employerBizNumber" TEXT,
  "employerName" TEXT,
  "employerCeoName" TEXT,
  "employerAddress" TEXT,
  "employerSignedAt" TIMESTAMP(3),
  "workerRealName" TEXT,
  "workerBirthDate" TEXT,
  "workerAddress" TEXT,
  "workerPhone" TEXT,
  "workerBankName" TEXT,
  "workerAccountNum" TEXT,
  "workerAccountHolder" TEXT,
  "workerSignedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "work_contracts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "work_contracts_sosMatchId_key" ON "work_contracts"("sosMatchId");
CREATE INDEX IF NOT EXISTS "work_contracts_sosRequestId_idx" ON "work_contracts"("sosRequestId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'work_contracts_sosRequestId_fkey'
  ) THEN
    ALTER TABLE "work_contracts"
    ADD CONSTRAINT "work_contracts_sosRequestId_fkey"
    FOREIGN KEY ("sosRequestId") REFERENCES "sos_requests"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'work_contracts_sosMatchId_fkey'
  ) THEN
    ALTER TABLE "work_contracts"
    ADD CONSTRAINT "work_contracts_sosMatchId_fkey"
    FOREIGN KEY ("sosMatchId") REFERENCES "sos_matches"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
