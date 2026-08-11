/**
 * 1회성 스크립트 — 20260811000000_add_schedule_date_to_sos_matches 마이그레이션 배포 *직후*,
 * 아직 진행 중인(취소/완료 아님) 다일 근무 SosRequest에 걸린 기존 ACCEPTED/CONFIRMED
 * SosMatch("요청 전체" 단위로 생성됐던 legacy 행, 마이그레이션 백필로 1일차에만 귀속됨)를
 * scheduleDays의 나머지 날짜별로 복제해 실제 배치 인원이 과소 집계되지 않도록 한다.
 *
 * 완료/취소된 과거 요청은 더 이상 상태 전이가 없으므로 건드리지 않는다(1일차 귀속 그대로 유지).
 *
 * 실행: npx ts-node scripts/split-legacy-multiday-matches.ts
 */
import { PrismaClient, SosMatchStatus, SosStatus } from "@prisma/client"

const prisma = new PrismaClient()

interface ScheduleDay {
  date: string
  startTime: string
  endTime: string
  endDate?: string
}

function extractDays(days: unknown): ScheduleDay[] | null {
  if (!Array.isArray(days) || days.length === 0) return null
  const result: ScheduleDay[] = []
  for (const d of days) {
    if (
      d &&
      typeof d === "object" &&
      typeof (d as Record<string, unknown>).date === "string"
    ) {
      result.push(d as unknown as ScheduleDay)
    }
  }
  return result.length > 0 ? result : null
}

async function main() {
  const liveMatches = await prisma.sosMatch.findMany({
    where: {
      status: { in: [SosMatchStatus.ACCEPTED, SosMatchStatus.CONFIRMED] },
      sosRequest: { status: { notIn: [SosStatus.CANCELLED, SosStatus.COMPLETED] } },
    },
    include: {
      sosRequest: { select: { id: true, scheduleDays: true } },
    },
  })

  let created = 0
  let skipped = 0

  for (const match of liveMatches) {
    const days = extractDays(match.sosRequest.scheduleDays)
    if (!days || days.length <= 1) continue // 단일 근무일이면 분리할 게 없음

    const otherDates = days.map((d) => d.date).filter((date) => date !== match.scheduleDate)
    if (otherDates.length === 0) continue

    for (const date of otherDates) {
      const existing = await prisma.sosMatch.findUnique({
        where: {
          sosRequestId_workerProfileId_scheduleDate: {
            sosRequestId: match.sosRequestId,
            workerProfileId: match.workerProfileId,
            scheduleDate: date,
          },
        },
      })
      if (existing) {
        skipped++
        continue
      }

      await prisma.sosMatch.create({
        data: {
          sosRequestId: match.sosRequestId,
          workerProfileId: match.workerProfileId,
          scheduleDate: date,
          status: match.status,
          notifiedAt: match.notifiedAt,
          respondedAt: match.respondedAt,
          confirmedAt: match.confirmedAt,
          missionReportedAt: match.missionReportedAt,
          missionConfirmedAt: match.missionConfirmedAt,
        },
      })
      created++
    }
  }

  console.log(`완료: ${created}건 생성, ${skipped}건 이미 존재해 스킵`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
