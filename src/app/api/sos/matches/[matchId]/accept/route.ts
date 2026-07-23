export const dynamic = 'force-dynamic'
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

  // 4-1. 월 8일/60시간 제한 검증 (동일 업체 대표 프로젝트 기준)
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)

  const existingMatches = await prisma.sosMatch.findMany({
    where: {
      workerProfileId: match.workerProfileId,
      status: { in: [SosMatchStatus.ACCEPTED, SosMatchStatus.CONFIRMED] },
      sosRequest: {
        companyId: match.sosRequest.companyId,
        scheduledAt: { gte: monthStart, lte: monthEnd },
      },
    },
    select: {
      sosRequest: {
        select: { scheduleDays: true, scheduledAt: true, scheduledEndAt: true },
      },
    },
  })

  // 기존 근무일 수 집계
  let existingDays = 0
  for (const em of existingMatches) {
    const days = em.sosRequest.scheduleDays
    if (Array.isArray(days) && days.length > 0) {
      existingDays += days.length
    } else {
      existingDays += 1
    }
  }

  // 이번 SOS의 일수
  const thisDays = Array.isArray(match.sosRequest.scheduleDays) && (match.sosRequest.scheduleDays as unknown[]).length > 0
    ? (match.sosRequest.scheduleDays as unknown[]).length
    : 1

  if (existingDays + thisDays >= 8) {
    return NextResponse.json(
      {
        error: `이번 달 동일 업체 배치 한도(월 8일 미만)를 초과합니다. 현재 ${existingDays}일 배치 완료 — 추가 ${thisDays}일 수락 시 ${existingDays + thisDays}일이 됩니다. 일용직 근로자 법적 기준을 준수하기 위해 동일 업체 월 8일 미만으로 제한됩니다.`,
        existingDays,
        thisDays,
        limit: 8,
      },
      { status: 422 }
    )
  }

  // 4-2. 포인트 잔액 확인 (일급의 10%)
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

  // 6. 업체 대표에게 수락 알림 + 경비 인력에게 안내 알림 발송
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
