-- SosMatch를 "근로자 x 요청 전체" 1행에서 "근로자 x 요청 x 날짜" 1행으로 세분화하기 위한 마이그레이션.
-- 1) 컬럼 추가(nullable) 2) 기존 행 백필 3) NOT NULL 전환 4) 유니크 제약을 3-컬럼으로 교체

-- 1. 컬럼 추가
ALTER TABLE "sos_matches" ADD COLUMN "scheduleDate" TEXT;
ALTER TABLE "sos_matches" ADD COLUMN "missionConfirmedAt" TIMESTAMP(3);

-- 2. 백필: 부모 SosRequest의 scheduleDays 첫 날짜, 없으면 scheduledAt을 "YYYY-MM-DD"로 변환
UPDATE "sos_matches" m
SET "scheduleDate" = COALESCE(
  (
    SELECT r."scheduleDays" -> 0 ->> 'date'
    FROM "sos_requests" r
    WHERE r.id = m."sosRequestId"
      AND r."scheduleDays" IS NOT NULL
      AND jsonb_typeof(r."scheduleDays") = 'array'
      AND jsonb_array_length(r."scheduleDays") > 0
  ),
  (
    SELECT to_char(r."scheduledAt", 'YYYY-MM-DD')
    FROM "sos_requests" r
    WHERE r.id = m."sosRequestId"
  )
)
WHERE m."scheduleDate" IS NULL;

-- 3. NOT NULL 전환
ALTER TABLE "sos_matches" ALTER COLUMN "scheduleDate" SET NOT NULL;

-- 4. 유니크 제약 교체: (sosRequestId, workerProfileId) -> (sosRequestId, workerProfileId, scheduleDate)
DROP INDEX "sos_matches_sosRequestId_workerProfileId_key";
CREATE UNIQUE INDEX "sos_matches_sosRequestId_workerProfileId_scheduleDate_key" ON "sos_matches"("sosRequestId", "workerProfileId", "scheduleDate");

-- 5. 날짜별 조회용 인덱스
CREATE INDEX "sos_matches_sosRequestId_scheduleDate_idx" ON "sos_matches"("sosRequestId", "scheduleDate");
