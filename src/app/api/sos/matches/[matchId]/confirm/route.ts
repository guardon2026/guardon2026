export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "@/lib/session"
import { UserRole, SosMatchStatus, SosStatus, AvailabilityStatus } from "@prisma/client"
import { createNotifications } from "@/lib/notify"
import { extractDays } from "@/lib/sos-matcher"

// ─────────────────────────────────────────
// POST /api/sos/matches/[matchId]/confirm
// 경비 업체가 수락된 인력을 최종 확정합니다.
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
    return NextResponse.json({ error: "경비 업체 계정만 확정할 수 있습니다." }, { status: 403 })
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

  // 요청의 예정 날짜 목록 (날짜별 requiredCount 포함, 없으면 요청 전체 requiredCount로 폴백)
  const days = extractDays(match.sosRequest.scheduleDays) ?? [
    { date: match.scheduleDate, startTime: "", endTime: "", requiredCount: match.sosRequest.requiredCount },
  ]

  // 5. 트랜잭션: 매치 확정 + 인력 상태 BUSY
  const [updatedMatch] = await prisma.$transaction([
    prisma.sosMatch.update({
      where: { id: matchId },
      data: {
        status: SosMatchStatus.CONFIRMED,
        confirmedAt: now,
      },
    }),
    prisma.workerProfile.update({
      where: { id: workerProfileId },
      data: { availability: AvailabilityStatus.BUSY },
    }),
  ])

  // 6. 모든 예정 날짜가 각자의 필요 인원을 충족했을 때만 요청 전체를 CONFIRMED로 전환
  const countsByDate = await prisma.sosMatch.groupBy({
    by: ["scheduleDate"],
    where: { sosRequestId, status: SosMatchStatus.CONFIRMED },
    _count: { _all: true },
  })
  const countMap = new Map(countsByDate.map((c) => [c.scheduleDate, c._count._all]))
  const fullyStaffed = days.every(
    (d) => (countMap.get(d.date) ?? 0) >= (d.requiredCount ?? match.sosRequest.requiredCount)
  )

  let updatedSosRequest = match.sosRequest
  if (fullyStaffed && match.sosRequest.status !== SosStatus.CONFIRMED) {
    const updated = await prisma.sosRequest.update({
      where: { id: sosRequestId },
      data: { status: SosStatus.CONFIRMED, confirmedAt: now },
    })
    updatedSosRequest = { ...match.sosRequest, status: updated.status, confirmedAt: updated.confirmedAt }
  }

  // 7. 경비 인력에게 확정 알림 + 업체에게 근로계약서 작성 안내 발송
  await createNotifications([
    {
      userId: match.workerProfile.userId,
      sosRequestId,
      type: "MATCH_CONFIRMED",
      title: "SOS 확정 알림",
      body: `'${match.sosRequest.title}' 요청의 ${match.scheduleDate} 근무가 최종 확정되었습니다. 배치 일정을 확인해 주세요.`,
    },
    {
      userId: session.user.id,
      sosRequestId,
      type: "CONTRACT_REQUIRED",
      title: "근로계약서 작성 안내",
      body: `인력 확정이 완료되었습니다. 근로기준법에 따라 근무 개시 전 근로계약서를 작성해야 합니다. SOS 상세 페이지에서 계약서를 작성해 주세요.`,
    },
  ])

  return NextResponse.json({
    match: updatedMatch,
    sosRequest: updatedSosRequest,
  })
}
