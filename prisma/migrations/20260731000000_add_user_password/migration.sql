-- 관리자 이메일+비밀번호 로그인용 컬럼 추가 (bcrypt 해시 저장, 카카오 로그인 사용자는 NULL)
ALTER TABLE "users"
ADD COLUMN IF NOT EXISTS "password" TEXT;
