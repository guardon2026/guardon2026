import { prisma } from "@/lib/prisma"

/**
 * 경비 인력 계정이 정지 상태일 때 throw되는 에러.
 * SOS 수락/신청 등 Route Handler에서 requireActiveWorker 호출 시 사용.
 */
export class WorkerSuspendedError extends Error {
  constructor(public readonly noShowCount: number) {
    super(`경비 인력 계정이 노쇼 누적으로 이용 정지되었습니다. (노쇼 ${noShowCount}회)`)
    this.name = "WorkerSuspendedError"
  }
}

const GATE_SELECT = { id: true, suspendedAt: true, noShowCount: true } as const

/**
 * 정지되지 않은 WorkerProfile을 반환하거나 WorkerSuspendedError를 throw한다.
 * 프로필이 아예 없는 경우 null 반환 — 호출부의 기존 "프로필 없음" 처리에 위임.
 */
export async function requireActiveWorker(userId: string) {
  const profile = await prisma.workerProfile.findUnique({
    where: { userId },
    select: GATE_SELECT,
  })
  if (!profile) return null
  if (profile.suspendedAt) throw new WorkerSuspendedError(profile.noShowCount)
  return profile
}

/** 정지 상태만 조회 (throw 없이). layout.tsx의 상태 분기 렌더링에 사용. */
export async function getWorkerSuspension(userId: string) {
  const profile = await prisma.workerProfile.findUnique({
    where: { userId },
    select: { suspendedAt: true, noShowCount: true },
  })
  return {
    suspended: !!profile?.suspendedAt,
    noShowCount: profile?.noShowCount ?? 0,
    suspendedAt: profile?.suspendedAt ?? null,
  }
}
