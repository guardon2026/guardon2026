-- 근로계약서 서명을 버튼 클릭 타임스탬프뿐 아니라 실제 서명 이미지(캔버스에
-- 직접 그린 서명, PNG data URL)로도 남길 수 있도록 컬럼 추가.

ALTER TABLE "work_contracts" ADD COLUMN "employerSignatureImage" TEXT;
ALTER TABLE "work_contracts" ADD COLUMN "workerSignatureImage" TEXT;
