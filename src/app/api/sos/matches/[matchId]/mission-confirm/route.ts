export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "@/lib/session"
import { UserRole, SosMatchStatus, SosStatus, AvailabilityStatus } from "@prisma/client"
// workerAccount 조회 불필요 — 일급은 경비 업체가 직접 지급
import { createNotifications } from "@/lib/notify"
import { sendKakaoMessages } from "@/lib/kakao-message"

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000"

// POST /api/sos/matches/[matchId]/mission-confirm
// 경비 업체가 경비 인력의 임무 완료 보고를 확인합니다.

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
    return NextResponse.json({ error: "경비 업체 계정만 확인할 수 있습니다." }, { status: 403 })
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
        select: { id: true, userId: true, user: { select: { name: true } } },
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
    return NextResponse.json({ error: "확정된 매치만 완료 확인할 수 있습니다." }, { status: 409 })
  }
  if (!match.missionReportedAt) {
    return NextResponse.json({ error: "경비 인력이 아직 임무 완료 보고를 하지 않았습니다." }, { status: 409 })
  }

  const sosRequestId = match.sosRequest.id
  const workerProfileId = match.workerProfile.id
  const workerUserId = match.workerProfile.userId
  const workerName = match.workerProfile.user.name ?? "경비 인력"
  const sosTitle = match.sosRequest.title
  const dailyPay = match.sosRequest.hourlyRate // hourlyRate 필드가 실제로는 일급
  const now = new Date()

  // 이 매치의 임무완료 확인 기록
  await prisma.sosMatch.update({
    where: { id: matchId },
    data: { missionConfirmedAt: now },
  })

  // 이 요청의 CONFIRMED 매치가 전부 임무완료 확인됐을 때만 요청 전체 COMPLETED로 전환
  const remaining = await prisma.sosMatch.count({
    where: { sosRequestId, status: SosMatchStatus.CONFIRMED, missionConfirmedAt: null },
  })
  if (remaining === 0) {
    await prisma.sosRequest.update({
      where: { id: sosRequestId },
      data: { status: SosStatus.COMPLETED },
    })
  }

  // 이 근로자가 같은 요청의 다른 날짜나 다른 요청에 여전히 활성 매치를 갖고 있지 않을 때만 AVAILABLE로 전환
  const otherActiveMatches = await prisma.sosMatch.count({
    where: {
      workerProfileId,
      id: { not: matchId },
      OR: [
        { status: SosMatchStatus.ACCEPTED },
        { status: SosMatchStatus.CONFIRMED, missionConfirmedAt: null },
      ],
    },
  })
  if (otherActiveMatches === 0) {
    await prisma.workerProfile.update({
      where: { id: workerProfileId },
      data: { availability: AvailabilityStatus.AVAILABLE },
    })
  }

  // 앱 알림 + 카카오톡 메시지 동시 발송
  const dueDate = new Date()
  dueDate.setDate(dueDate.getDate() + 14)
  const dueDateStr = dueDate.toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })

  const kakaoBody =
    `✅ 임무 완료가 확정되었습니다!\n\n` +
    `현장: ${sosTitle}\n` +
    `일급: ${dailyPay.toLocaleString()}원\n` +
    `지급 기한: ${dueDateStr}까지 (확정일로부터 14일 이내)\n\n` +
    `경비 업체에게 직접 일급을 수령하시기 바랍니다.\n` +
    `수고하셨습니다!`

  await Promise.all([
    createNotifications([
      {
        userId: workerUserId,
        sosRequestId,
        type: "MISSION_CONFIRMED",
        title: "임무 완료 확정 — 일급 지급 안내",
        body: `${sosTitle} 임무 완료가 확정되었습니다. 일급 ${dailyPay.toLocaleString()}원을 확정일로부터 14일 이내(${dueDateStr}까지) 경비 업체에게 직접 수령하세요.`,
      },
    ]),
    sendKakaoMessages([
      {
        userId: workerUserId,
        title: `[GuardOn] 임무 완료 확인 — ${sosTitle}`,
        body: kakaoBody,
      },
    ]),
  ])

  return NextResponse.json({ success: true })
}
