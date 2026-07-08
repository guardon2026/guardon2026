import { randomUUID } from "crypto"
import { mkdir, writeFile } from "fs/promises"
import path from "path"

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
])

const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024

export function isAllowedCompanyDocument(file: File) {
  return ALLOWED_MIME_TYPES.has(file.type) && file.size > 0 && file.size <= MAX_FILE_SIZE_BYTES
}

export function companyDocumentError(file: File) {
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return "JPG, PNG, WEBP, PDF, DOCX 파일만 업로드할 수 있습니다."
  }
  if (file.size <= 0) {
    return "빈 파일은 업로드할 수 없습니다."
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return "파일은 20MB 이하만 업로드할 수 있습니다."
  }
  return null
}

function extensionFor(file: File) {
  const fromName = file.name.split(".").pop()?.toLowerCase()
  if (fromName && /^[a-z0-9]+$/.test(fromName)) return fromName

  switch (file.type) {
    case "image/jpeg":
      return "jpg"
    case "image/png":
      return "png"
    case "image/webp":
      return "webp"
    case "application/pdf":
      return "pdf"
    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      return "docx"
    default:
      return "bin"
  }
}

export async function saveCompanyDocument(file: File, ownerId: string, kind: string) {
  const error = companyDocumentError(file)
  if (error) throw new Error(error)

  const uploadDir = path.join(process.cwd(), "public", "uploads", "company-documents", ownerId)
  await mkdir(uploadDir, { recursive: true })

  const filename = `${kind}-${Date.now()}-${randomUUID()}.${extensionFor(file)}`
  const absolutePath = path.join(uploadDir, filename)
  const buffer = Buffer.from(await file.arrayBuffer())

  await writeFile(absolutePath, buffer)

  return `/uploads/company-documents/${ownerId}/${filename}`
}
