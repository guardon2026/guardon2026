export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "@/lib/session"
import { UserRole, SosMatchStatus } from "@prisma/client"
import { createNotifications } from "@/lib/notify"

// POST /api/sos/matches/[matchId]/cancel
// 경비 인력이 수락한 SOS 매치를 취소합니다. 수락에 별도 비용이 없으므로 포인트 처리는 없다.

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  const { matchId } = await params

  const session = await getServerSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 })
  }
  if (session.user.role !== UserRole.WORKER) {
    return NextResponse.json({ error: "경비 인력 계정만 취소할 수 있습니다." }, { status: 403 })
  }

  const match = await prisma.sosMatch.findUnique({
    where: { id: matchId },
    include: {
      workerProfile: {
        select: { id: true, userId: true },
      },
      sosRequest: {
        include: {
          company: {
            select: { id: true, ownerId: true },
          },
        },
      },
    },
  })

  if (!match) {
    return NextResponse.json({ error: "매치 정보를 찾을 수 없습니다." }, { status: 404 })
  }
  if (match.workerProfile.userId !== session.user.id) {
    return NextResponse.json({ error: "접근 권한이 없습니다." }, { status: 403 })
  }
  if (match.status !== SosMatchStatus.ACCEPTED) {
    return NextResponse.json({ error: "수락 상태의 매치만 취소할 수 있습니다." }, { status: 409 })
  }

  const sosRequestId = match.sosRequest.id
  const sosTitle = match.sosRequest.title
  const companyOwnerId = match.sosRequest.company.ownerId

  await prisma.$transaction(async (tx) => {
    // 매치 상태 → REJECTED (취소)
    await tx.sosMatch.update({
      where: { id: matchId },
      data: { status: SosMatchStatus.REJECTED, respondedAt: new Date() },
    })

    // 워커 availability 복원 — 같은 요청의 다른 날짜나 다른 요청에 여전히 활성 매치가 없을 때만
    const otherActiveMatches = await tx.sosMatch.count({
      where: {
        workerProfileId: match.workerProfile.id,
        id: { not: matchId },
        OR: [
          { status: SosMatchStatus.ACCEPTED },
          { status: SosMatchStatus.CONFIRMED, noShowAt: null },
        ],
      },
    })
    if (otherActiveMatches === 0) {
      await tx.workerProfile.update({
        where: { id: match.workerProfile.id },
        data: { availability: "AVAILABLE" },
      })
    }
  })

  // 알림 발송
  await createNotifications([
    {
      userId: session.user.id,
      sosRequestId,
      type: "SYSTEM_NOTICE",
      title: "SOS 수락 취소 완료",
      body: `'${sosTitle}' 수락을 취소했습니다.`,
    },
    {
      userId: companyOwnerId,
      sosRequestId,
      type: "MATCH_CANCELLED",
      title: "SOS 수락 취소 알림",
      body: `'${sosTitle}' 요청의 경비 인력이 수락을 취소했습니다.`,
    },
  ])

  return NextResponse.json({ cancelled: true })
}
