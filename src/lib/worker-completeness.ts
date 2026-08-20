export interface WorkerCompletenessInput {
  address: string | null
  city: string | null
  district: string | null
  workFields: string[]
  declaredCredentials: string[]
  height: number | null
  weight: number | null
  desiredHourlyRate: number | null
  bio: string | null
  bankVerifiedAt: Date | null
  rrnRegisteredAt: Date | null
  user: { name: string | null; phone: string | null }
}

/**
 * 경비 인력이 SOS에 신청·수락하기 전에 반드시 채워야 하는 "내 정보" 전체 항목이
 * 모두 있는지 판정한다. bankVerifiedAt/rrnRegisteredAt은 관련 필드들과 함께
 * 원자적으로 세팅되므로 타임스탬프만 확인하면 하위 필드도 채워졌다고 볼 수 있다.
 */
export function getWorkerCompleteness(p: WorkerCompletenessInput): { complete: boolean; missing: string[] } {
  const missing: string[] = []
  if (!p.user.name?.trim()) missing.push("성명")
  if (!p.user.phone?.trim()) missing.push("연락처")
  if (p.workFields.length === 0) missing.push("전문 분야")
  if (p.height == null) missing.push("키")
  if (p.weight == null) missing.push("몸무게")
  if (p.desiredHourlyRate == null) missing.push("희망 시급")
  if (!p.address?.trim() || !p.city?.trim() || !p.district?.trim()) missing.push("주소")
  if (p.declaredCredentials.length === 0) missing.push("보유 자격증")
  if (!p.bio?.trim()) missing.push("자기소개")
  if (!p.bankVerifiedAt) missing.push("계좌 정보")
  if (!p.rrnRegisteredAt) missing.push("주민등록번호")
  return { complete: missing.length === 0, missing }
}

export const WORKER_COMPLETENESS_SELECT = {
  address: true,
  city: true,
  district: true,
  workFields: true,
  declaredCredentials: true,
  height: true,
  weight: true,
  desiredHourlyRate: true,
  bio: true,
  bankVerifiedAt: true,
  rrnRegisteredAt: true,
  user: { select: { name: true, phone: true } },
} as const
