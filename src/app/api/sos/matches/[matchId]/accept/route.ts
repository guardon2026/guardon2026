export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "@/lib/session"
import { UserRole, SosMatchStatus, SosMatchInsuranceStatus } from "@prisma/client"
import { createNotifications } from "@/lib/notify"
import { getMonthlyWorkStats, calcDayHours, extractDays } from "@/lib/sos-matcher"
import { getWorkerCompleteness, WORKER_COMPLETENESS_SELECT } from "@/lib/worker-completeness"

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
      workerProfile: { select: { userId: true, ...WORKER_COMPLETENESS_SELECT } },
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

  // 4-0. 프로필 완성도 확인 — 미완성 프로필로는 SOS 수락 불가 (세금 신고 공백 방지)
  const { complete, missing } = getWorkerCompleteness(match.workerProfile)
  if (!complete) {
    return NextResponse.json(
      { error: "프로필을 먼저 완성해야 SOS를 수락할 수 있습니다.", missing },
      { status: 403 }
    )
  }

  // 4-1. 이번 달 동일 업체 누적 근무 확인 → 4대보험(국민연금·건강보험) 가입 대상 여부 자동 판정
  //      (더 이상 수락을 차단하지 않고, 올바른 보험 상태로 분류만 한다)
  const now = new Date()
  const monthStartStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`
  const monthEndDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  const monthEndStr = `${monthEndDate.getFullYear()}-${String(monthEndDate.getMonth() + 1).padStart(2, "0")}-${String(monthEndDate.getDate()).padStart(2, "0")}`

  const { days: existingDays, hours: existingHours } = await getMonthlyWorkStats(
    match.workerProfileId,
    match.sosRequest.companyId,
    monthStartStr,
    monthEndStr,
    matchId,
  )

  const thisDayEntry = extractDays(match.sosRequest.scheduleDays)?.find((d) => d.date === match.scheduleDate)
  const thisHours = thisDayEntry ? calcDayHours(thisDayEntry) : 8

  const crosses = existingDays + 1 >= 8 || existingHours + thisHours >= 60
  const insuranceStatus = crosses ? SosMatchInsuranceStatus.INSURED : SosMatchInsuranceStatus.DAILY_WORKER

  // 4-2. 포인트 잔액 확인 (SOS 수락 선결제 — 매치 1건(=1일)당 1,000원 고정.
  //      취소 시 전액 환불되며, 임무가 정상 완료되면 플랫폼 수수료로 전환된다.)
  const workerFee = 1000
  const workerAccount = await prisma.pointAccount.findUnique({
    where: { userId: session.user.id },
  })
  if (!workerAccount || workerAccount.balance < workerFee) {
    return NextResponse.json(
      {
        error: `포인트가 부족합니다. 수락 선결제: ${workerFee.toLocaleString()}P, 보유: ${(workerAccount?.balance ?? 0).toLocaleString()}P`,
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
      data: { status: SosMatchStatus.ACCEPTED, respondedAt: new Date(), insuranceStatus },
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
        description: `SOS 수락 선결제: ${match.sosRequest.title}`,
        sosRequestId: match.sosRequest.id,
      },
    }),
  ])

  // 6. 경비 업체에게 수락 알림 + 경비 인력에게 안내 알림 발송
  const workerName = session.user.name ?? "경비 인력"
  const sosTitle = match.sosRequest.title
  const companyOwnerId = match.sosRequest.company.ownerId
  await createNotifications([
    {
      userId: companyOwnerId,
      sosRequestId: match.sosRequest.id,
      type: "MATCH_ACCEPTED",
      title: "SOS 수락 알림",
      body: `${sosTitle} 요청의 ${match.scheduleDate}에 ${workerName}이(가) 수락했습니다. 최종 확정을 진행해 주세요.`,
    },
  ])

  return NextResponse.json({ match: updated, insuranceNotice: crosses })
}
