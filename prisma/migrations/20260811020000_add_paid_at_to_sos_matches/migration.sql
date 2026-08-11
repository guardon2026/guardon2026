-- 경비 업체가 SOS 임무 완료 후 인건비를 실지급했는지 표시/추적하기 위한 컬럼 추가.
-- 단순 추가(nullable, 기본값 없음, 백필 불필요) — insuranceStatus 마이그레이션과 동일한 패턴.

ALTER TABLE "sos_matches" ADD COLUMN "paidAt" TIMESTAMP(3);
