const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "application/pdf",
])

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024

export function isAllowedCompanyDocument(file: File) {
  return ALLOWED_MIME_TYPES.has(file.type) && file.size > 0 && file.size <= MAX_FILE_SIZE_BYTES
}

export function companyDocumentError(file: File) {
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return "JPG, PNG, PDF 파일만 업로드할 수 있습니다."
  }
  if (file.size <= 0) {
    return "빈 파일은 업로드할 수 없습니다."
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return "파일은 10MB 이하만 업로드할 수 있습니다."
  }
  return null
}

/** 파일 검증 후 버퍼로 읽어들인다 (DB 저장용 — 로컬 디스크는 배포 시마다 초기화되어 사용하지 않음) */
export async function readCompanyDocument(file: File) {
  const error = companyDocumentError(file)
  if (error) throw new Error(error)
  return Buffer.from(await file.arrayBuffer())
}
