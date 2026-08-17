export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "@/lib/session"
import { UserRole, SosMatchStatus, AvailabilityStatus } from "@prisma/client"
import { createNotifications } from "@/lib/notify"
import { toISODate } from "@/lib/sos-matcher"

// 노쇼 누적 3회 시 자동 서비스 이용 정지
const NO_SHOW_SUSPEND_THRESHOLD = 3

// POST /api/sos/matches/[matchId]/no-show
// 경비 업체가 최종 확정(CONFIRMED)한 경비 인력이 나타나지 않았을 때 노쇼로 처리합니다.

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  const { matchId } = await params

  const session = await getServerSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 })
  }
  if (session.user.role !== UserRole.COMPANY_OWNER) {
    return NextResponse.json({ error: "경비 업체 계정만 처리할 수 있습니다." }, { status: 403 })
  }

  const match = await prisma.sosMatch.findUnique({
    where: { id: matchId },
    include: {
      sosRequest: {
        include: {
          company: { select: { ownerId: true } },
        },
      },
      workerProfile: {
        select: { id: true, userId: true, noShowCount: true, suspendedAt: true, user: { select: { name: true } } },
      },
    },
  })

  if (!match) {
    return NextResponse.json({ error: "매치 정보를 찾을 수 없습니다." }, { status: 404 })
  }
  if (match.sosRequest.company.ownerId !== session.user.id) {
    return NextResponse.json({ error: "접근 권한이 없습니다." }, { status: 403 })
  }
  if (match.status !== SosMatchStatus.CONFIRMED) {
    return NextResponse.json({ error: "확정된 매치만 노쇼 처리할 수 있습니다." }, { status: 409 })
  }
  if (match.missionReportedAt) {
    return NextResponse.json({ error: "이미 임무 완료 보고를 한 매치는 노쇼 처리할 수 없습니다." }, { status: 409 })
  }
  if (match.noShowAt) {
    return NextResponse.json({ error: "이미 노쇼 처리된 매치입니다." }, { status: 409 })
  }
  if (toISODate(new Date()) < match.scheduleDate) {
    return NextResponse.json({ error: "근무 예정일 이전에는 노쇼 처리할 수 없습니다." }, { status: 409 })
  }

  const workerProfileId = match.workerProfile.id
  const workerUserId = match.workerProfile.userId
  const workerName = match.workerProfile.user.name ?? "경비 인력"
  const sosRequestId = match.sosRequest.id
  const sosTitle = match.sosRequest.title
  const now = new Date()

  const suspended = await prisma.$transaction(async (tx) => {
    await tx.sosMatch.update({
      where: { id: matchId },
      data: { noShowAt: now },
    })

    const updated = await tx.workerProfile.update({
      where: { id: workerProfileId },
      data: { noShowCount: { increment: 1 } },
    })

    if (updated.noShowCount >= NO_SHOW_SUSPEND_THRESHOLD && !updated.suspendedAt) {
      await tx.workerProfile.update({
        where: { id: workerProfileId },
        data: { suspendedAt: now, availability: AvailabilityStatus.UNAVAILABLE },
      })
      return true
    }

    // 노쇼로 이 매치가 종료됐으므로, 다른 활성 매치가 없으면 AVAILABLE로 복원
    const otherActiveMatches = await tx.sosMatch.count({
      where: {
        workerProfileId,
        id: { not: matchId },
        OR: [
          { status: SosMatchStatus.ACCEPTED },
          { status: SosMatchStatus.CONFIRMED, missionConfirmedAt: null, noShowAt: null },
        ],
      },
    })
    if (otherActiveMatches === 0) {
      await tx.workerProfile.update({
        where: { id: workerProfileId },
        data: { availability: AvailabilityStatus.AVAILABLE },
      })
    }
    return false
  })

  await createNotifications([
    {
      userId: workerUserId,
      sosRequestId,
      type: "NO_SHOW_RECORDED",
      title: "노쇼 처리 안내",
      body: suspended
        ? `'${sosTitle}' 근무에 노쇼(무단 불참)가 기록되었습니다. 노쇼 누적 ${NO_SHOW_SUSPEND_THRESHOLD}회로 서비스 이용이 정지되었습니다.`
        : `'${sosTitle}' 근무에 노쇼(무단 불참)가 기록되었습니다.`,
    },
  ])

  return NextResponse.json({ success: true, suspended, workerName })
}
