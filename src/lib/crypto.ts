import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto"

// 주민등록번호 등 고유식별정보 저장용 AES-256-GCM 암호화.
// 개인정보보호법상 고유식별정보는 평문 저장이 금지되어 있어 마스킹이 아닌
// 실제 복호화 가능한 암호화로 저장한다 (4대보험·세금 신고에는 전체 번호가 필요).

const ALGORITHM = "aes-256-gcm"
const IV_LENGTH = 12
const AUTH_TAG_LENGTH = 16

function getKey(): Buffer {
  const secret = process.env.ENCRYPTION_KEY
  if (!secret) throw new Error("ENCRYPTION_KEY is not set")
  return scryptSync(secret, "guardon-pii-encryption", 32)
}

export function encryptPii(plain: string): string {
  const key = getKey()
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()])
  const authTag = cipher.getAuthTag()
  return Buffer.concat([iv, authTag, encrypted]).toString("base64")
}

export function decryptPii(payload: string): string {
  const key = getKey()
  const buf = Buffer.from(payload, "base64")
  const iv = buf.subarray(0, IV_LENGTH)
  const authTag = buf.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH)
  const encrypted = buf.subarray(IV_LENGTH + AUTH_TAG_LENGTH)
  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8")
}

// 화면 표시용: 뒷자리 첫 숫자만 남기고 마스킹 (예: 900101-1******)
export function maskRrn(plain: string): string {
  const cleaned = plain.replace(/-/g, "")
  return `${cleaned.slice(0, 6)}-${cleaned[6]}******`
}

export function formatRrnDisplay(plain: string): string {
  const cleaned = plain.replace(/-/g, "")
  return `${cleaned.slice(0, 6)}-${cleaned.slice(6)}`
}
