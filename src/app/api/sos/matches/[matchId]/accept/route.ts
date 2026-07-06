import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "@/lib/session"
import { UserRole, SosMatchStatus } from "@prisma/client"
import { createNotifications } from "@/lib/notify"

// ─────────────────────────────────────────
// POST /api/sos/matches/[matchId]/accept
// 경비 인력이 SOS 요청을 수락합니다.
// ─────────────────────────────────────────

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  const { matchId } = await params

  // 1. 인증 확인 (WORKER 역할 필요)
  const session = await getServerSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 })
  }
  if (session.user.role !== UserRole.WORKER) {
    return NextResponse.json({ error: "경비 인력 계정만 수락할 수 있습니다." }, { status: 403 })
  }

  // 2. 매치 조회
  const match = await prisma.sosMatch.findUnique({
    where: { id: matchId },
    include: {
      workerProfile: { select: { userId: true } },
      sosRequest: {
        include: {
          company: { select: { ownerId: true } },
        },
      },
    },
  })

  if (!match) {
    return NextResponse.json({ error: "매치 정보를 찾을 수 없습니다." }, { status: 404 })
  }

  // 3. 소유권 확인 (본인의 매치인지)
  if (match.workerProfile.userId !== session.user.id) {
    return NextResponse.json({ error: "접근 권한이 없습니다." }, { status: 403 })
  }

  // 4. 상태 확인 (NOTIFIED 상태만 수락 가능)
  if (match.status !== SosMatchStatus.NOTIFIED) {
    return NextResponse.json(
      { error: "이미 처리된 요청입니다. 수락 또는 거절이 완료된 매치는 변경할 수 없습니다." },
      { status: 409 }
    )
  }

  // 4-1. 포인트 잔액 확인 (일급의 10%)
  const workerFee = Math.floor(match.sosRequest.hourlyRate * 0.1)
  const workerAccount = await prisma.pointAccount.findUnique({
    where: { userId: session.user.id },
  })
  if (!workerAccount || workerAccount.balance < workerFee) {
    return NextResponse.json(
      {
        error: `포인트가 부족합니다. 수락 수수료: ${workerFee.toLocaleString()}P, 보유: ${(workerAccount?.balance ?? 0).toLocaleString()}P`,
        requiredPoints: workerFee,
        currentBalance: workerAccount?.balance ?? 0,
      },
      { status: 402 }
    )
  }

  // 5. 상태 업데이트: ACCEPTED + 포인트 차감
  const [updated] = await prisma.$transaction([
    prisma.sosMatch.update({
      where: { id: matchId },
      data: { status: SosMatchStatus.ACCEPTED, respondedAt: new Date() },
    }),
    prisma.pointAccount.update({
      where: { id: workerAccount.id },
      data: { balance: { decrement: workerFee } },
    }),
    prisma.pointTransaction.create({
      data: {
        accountId: workerAccount.id,
        amount: -workerFee,
        type: "WORKER_DEDUCT",
        description: `SOS 수락 수수료: ${match.sosRequest.title}`,
        sosRequestId: match.sosRequest.id,
      },
    }),
  ])

  // 6. 업체 대표에게 수락 알림 발송
  const workerName = session.user.name ?? "경비 인력"
  const sosTitle = match.sosRequest.title
  const companyOwnerId = match.sosRequest.company.ownerId
  await createNotifications([
    {
      userId: companyOwnerId,
      sosRequestId: match.sosRequest.id,
      type: "MATCH_ACCEPTED",
      title: "SOS 수락 알림",
      body: `${sosTitle} 요청에 ${workerName}이(가) 수락했습니다. 최종 확정을 진행해 주세요.`,
    },
  ])

  return NextResponse.json({ match: updated })
}
