-- 경비 인력이 SOS 날짜를 수락할 때, 동일 업체와의 이번 달 실제 누적 근무 이력을 기준으로
-- 일용직/4대보험 대상 여부를 판정해 저장하기 위한 컬럼 추가.
-- 기본값이 있는 단순 추가라 별도 백필이 필요 없음 (scheduleDate 마이그레이션과 다름).

CREATE TYPE "SosMatchInsuranceStatus" AS ENUM ('DAILY_WORKER', 'INSURED');

ALTER TABLE "sos_matches" ADD COLUMN "insuranceStatus" "SosMatchInsuranceStatus" NOT NULL DEFAULT 'DAILY_WORKER';
