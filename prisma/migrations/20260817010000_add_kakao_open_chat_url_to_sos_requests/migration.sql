-- 카카오 오픈채팅 링크를 업체 단위가 아니라 SOS 요청(현장)마다 별도로 받도록 변경.
-- 단순 추가(nullable, 백필 불필요) — 기존 Company.kakaoOpenChatUrl 컬럼은 더 이상
-- 앱에서 쓰지 않지만 데이터 보존을 위해 그대로 둔다.

ALTER TABLE "sos_requests" ADD COLUMN "kakaoOpenChatUrl" TEXT;
