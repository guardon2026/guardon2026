-- 경비 인력 노쇼(무단 불참) 카운트, 서비스 이용 정지 시각, 매치별 노쇼 마킹 컬럼 추가.
-- 단순 추가(nullable 또는 기본값 포함, 백필 불필요) — paidAt/insuranceStatus 마이그레이션과 동일한 패턴.
-- SosMatchStatus enum을 확장하지 않고 confirmedAt/missionReportedAt/missionConfirmedAt/paidAt과
-- 동일하게 nullable timestamp로 상태를 표현하는 기존 컨벤션을 따른다.

ALTER TABLE "worker_profiles" ADD COLUMN "noShowCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "worker_profiles" ADD COLUMN "suspendedAt" TIMESTAMP(3);
ALTER TABLE "sos_matches" ADD COLUMN "noShowAt" TIMESTAMP(3);
