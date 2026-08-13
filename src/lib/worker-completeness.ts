export interface WorkerCompletenessInput {
  address: string | null
  city: string | null
  district: string | null
  rrnVerifiedAt: Date | null
  bankVerifiedAt: Date | null
  user: { name: string | null; phone: string | null }
}

/**
 * 경비 인력이 SOS에 신청·수락하기 전에 반드시 채워야 하는 8개 항목(성명·생년월일·
 * 주민번호 본인인증·연락처·주소·은행명·계좌번호·예금주)이 모두 있는지 판정한다.
 * rrnVerifiedAt/bankVerifiedAt은 관련 필드들과 함께 원자적으로 세팅되므로 타임스탬프만
 * 확인하면 하위 필드도 채워졌다고 볼 수 있다. workFields(업무 분야)는 매칭 조건이라
 * 여기 포함하지 않고 호출부에서 별도로 체크한다.
 */
export function getWorkerCompleteness(p: WorkerCompletenessInput): { complete: boolean; missing: string[] } {
  const missing: string[] = []
  if (!p.user.name?.trim()) missing.push("성명")
  if (!p.rrnVerifiedAt) missing.push("본인인증")
  if (!p.user.phone?.trim()) missing.push("연락처")
  if (!p.address?.trim() || !p.city?.trim() || !p.district?.trim()) missing.push("주소")
  if (!p.bankVerifiedAt) missing.push("계좌 정보")
  return { complete: missing.length === 0, missing }
}

export const WORKER_COMPLETENESS_SELECT = {
  address: true,
  city: true,
  district: true,
  rrnVerifiedAt: true,
  bankVerifiedAt: true,
  user: { select: { name: true, phone: true } },
} as const
