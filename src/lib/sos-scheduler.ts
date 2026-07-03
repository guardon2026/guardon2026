import { prisma } from "@/lib/prisma"
import { matchWorkers } from "@/lib/sos-matcher"
import { createNotifications } from "@/lib/notify"
import { SosMatchStatus, SosStatus } from "@prisma/client"

// NOTE: MVP에서는 setTimeout으로 구현합니다.
// 프로덕션에서는 BullMQ 또는 Inngest와 같은 큐 시스템으로 교체해야 합니다.
// setTimeout은 서버 재시작 시 스케줄이 초기화되는 문제가 있습니다.

const RADIUS_EXPANSION_DELAY_MS = 15 * 60 * 1000 // 15분
const UNRESOLVED_CHECK_DELAY_MS = 60 * 60 * 1000  // 1시간
const EXPANDED_RADIUS_KM = 50

/**
 * 15분 후 반경을 50km로 확장하고 추가 매칭을 시도한다.
 * FR19: 반경 자동 확장 로직
 *
 * TODO(production): Replace with BullMQ/Inngest job scheduling
 */
export function scheduleRadiusExpansion(sosRequestId: string): void {
  setTimeout(async () => {
    try {
      const sosRequest = await prisma.sosRequest.findUnique({
        where: { id: sosRequestId },
        select: { id: true, status: true, radiusKm: true, requiredCount: true },
      })

      // 이미 확정/취소/완료된 요청은 처리 불필요
      if (
        !sosRequest ||
        sosRequest.status === SosStatus.CONFIRMED ||
        sosRequest.status === SosStatus.CANCELLED ||
        sosRequest.status === SosStatus.COMPLETED
      ) {
        return
      }

      // 반경 확장
      await prisma.sosRequest.update({
        where: { id: sosRequestId },
        data: {
          radiusKm: EXPANDED_RADIUS_KM,
          expandedAt: new Date(),
        },
      })

      // 추가 매칭 시도
      const newMatches = await matchWorkers(sosRequestId)
      if (newMatches.length === 0) return

      const now = new Date()

      await prisma.sosMatch.createMany({
        data: newMatches.map((m) => ({
          sosRequestId,
          workerProfileId: m.workerProfileId,
          status: SosMatchStatus.NOTIFIED,
          notifiedAt: now,
        })),
        skipDuplicates: true,
      })

      await createNotifications(
        newMatches.map((m) => ({
          userId: m.userId,
          sosRequestId,
          type: "SOS_REQUEST",
          title: "SOS 긴급 요청 알림 (확장)",
          body: "반경이 확장된 SOS 긴급 배치 요청이 접수되었습니다. 지금 확인해 주세요.",
          sentAt: now,
        })),
      )
    } catch (err) {
      // 스케줄 오류는 로그만 남기고 무시 (서버 재시작 시 재실행 불가 — 프로덕션에서 큐 필요)
      console.error("[SOS scheduler] scheduleRadiusExpansion error:", err)
    }
  }, RADIUS_EXPANSION_DELAY_MS)
}

/**
 * 1시간 후 여전히 확정되지 않은 요청을 UNRESOLVED로 마킹한다.
 * FR24: 미해결 처리 로직
 *
 * TODO(production): Replace with BullMQ/Inngest job scheduling
 */
export function scheduleUnresolvedCheck(sosRequestId: string): void {
  setTimeout(async () => {
    try {
      const sosRequest = await prisma.sosRequest.findUnique({
        where: { id: sosRequestId },
        select: { id: true, status: true },
      })

      // DISPATCHING 상태가 아니면 이미 처리된 요청 (확정/취소/완료 등)
      if (!sosRequest || sosRequest.status !== SosStatus.DISPATCHING) return

      await prisma.sosRequest.update({
        where: { id: sosRequestId },
        data: {
          status: SosStatus.UNRESOLVED,
          unresolvedAt: new Date(),
        },
      })
    } catch (err) {
      console.error("[SOS scheduler] scheduleUnresolvedCheck error:", err)
    }
  }, UNRESOLVED_CHECK_DELAY_MS)
}
