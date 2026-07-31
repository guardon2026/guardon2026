-- 회사 제출 서류 파일을 DB에 직접 저장 (배포 시마다 초기화되는 로컬 디스크 저장 방식 대체)
ALTER TABLE "company_documents"
ADD COLUMN IF NOT EXISTS "fileData" BYTEA;
