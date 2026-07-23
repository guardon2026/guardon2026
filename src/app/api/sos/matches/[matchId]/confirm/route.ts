export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "@/lib/session"
import { UserRole, SosMatchStatus, SosStatus, AvailabilityStatus } from "@prisma/client"
import { createNotifications } from "@/lib/notify"

// ─────────────────────────────────────────
// POST /api/sos/matches/[matchId]/confirm
// 업체 대표가 수락된 인력을 최종 확정합니다.
// ─────────────────────────────────────────

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  const { matchId } = await params

  // 1. 인증 확인 (COMPANY_OWNER 역할 필요)
  const session = await getServerSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 })
  }
  if (session.user.role !== UserRole.COMPANY_OWNER) {
    return NextResponse.json({ error: "업체 대표 계정만 확정할 수 있습니다." }, { status: 403 })
  }

  // 2. 매치 조회 (SOS 요청 및 업체 정보 포함)
  const match = await prisma.sosMatch.findUnique({
    where: { id: matchId },
    include: {
      sosRequest: {
        include: {
          company: { select: { id: true, ownerId: true } },
        },
      },
      workerProfile: { select: { id: true, userId: true } },
    },
  })

  if (!match) {
    return NextResponse.json({ error: "매치 정보를 찾을 수 없습니다." }, { status: 404 })
  }

  // 3. 테넌트 격리: 본인 업체의 SOS 요청인지 확인
  if (match.sosRequest.company.ownerId !== session.user.id) {
    return NextResponse.json({ error: "접근 권한이 없습니다." }, { status: 403 })
  }

  // 4. 상태 확인 (ACCEPTED 상태만 확정 가능)
  if (match.status !== SosMatchStatus.ACCEPTED) {
    return NextResponse.json(
      { error: "수락된 매치만 최종 확정할 수 있습니다." },
      { status: 409 }
    )
  }

  const now = new Date()
  const sosRequestId = match.sosRequest.id
  const workerProfileId = match.workerProfile.id

  // 5. 현재 확정된 인원 수 조회
  const confirmedCount = await prisma.sosMatch.count({
    where: {
      sosRequestId,
      status: SosMatchStatus.CONFIRMED,
    },
  })

  // 6. 트랜잭션: 매치 확정 + 인력 상태 BUSY + SOS 요청 상태 업데이트
  const newConfirmedCount = confirmedCount + 1
  const meetsRequired = newConfirmedCount >= match.sosRequest.requiredCount

  const [updatedMatch, , updatedSosRequest] = await prisma.$transaction([
    // 매치 상태 → CONFIRMED
    prisma.sosMatch.update({
      where: { id: matchId },
      data: {
        status: SosMatchStatus.CONFIRMED,
        confirmedAt: now,
      },
    }),
    // 인력 가용 상태 → BUSY
    prisma.workerProfile.update({
      where: { id: workerProfileId },
      data: { availability: AvailabilityStatus.BUSY },
    }),
    // 필요 인원 충족 시 SOS 요청 → CONFIRMED
    prisma.sosRequest.update({
      where: { id: sosRequestId },
      data: meetsRequired
        ? { status: SosStatus.CONFIRMED, confirmedAt: now }
        : {},
    }),
  ])

  // 7. 경비 인력에게 확정 알림 발송
  await createNotifications([{
    userId: match.workerProfile.userId,
    sosRequestId,
    type: "MATCH_CONFIRMED",
    title: "SOS 확정 알림",
    body: `'${match.sosRequest.title}' 요청에 최종 확정되었습니다. 배치 일정을 확인해 주세요.`,
  }])

  return NextResponse.json({
    match: updatedMatch,
    sosRequest: updatedSosRequest,
  })
}
