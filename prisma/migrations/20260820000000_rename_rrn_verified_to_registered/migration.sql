-- 주민등록번호는 더 이상 "본인 인증"이 아니라 4대보험·세금 신고를 위해
-- 암호화 저장하는 등록 정보이므로 컬럼명을 실제 의미에 맞게 변경한다.
-- 기존 값 보존(rename만 수행, 데이터 손실 없음).

ALTER TABLE "worker_profiles" RENAME COLUMN "rrnVerifiedAt" TO "rrnRegisteredAt";
