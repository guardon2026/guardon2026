import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "@/lib/session"
import { requireApprovedCompany, CompanyNotApprovedError } from "@/lib/company-gate"
import { SosMatchStatus, SosStatus, UserRole } from "@prisma/client"
import { createNotifications } from "@/lib/notify"

// POST /api/sos/requests/[id]/cancel
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  // 1. 인증
  const session = await getServerSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 })
  }
  if (session.user.role !== UserRole.COMPANY_OWNER) {
    return NextResponse.json({ error: "업체 대표 계정만 취소할 수 있습니다." }, { status: 403 })
  }

  // 2. 업체 승인 확인
  let company
  try {
    company = await requireApprovedCompany(session.user.id)
  } catch (e) {
    if (e instanceof CompanyNotApprovedError) {
      return NextResponse.json({ error: "승인된 업체만 취소할 수 있습니다." }, { status: 403 })
    }
    throw e
  }

  // 3. SOS 요청 조회
  const sosRequest = await prisma.sosRequest.findUnique({
    where: { id },
    select: {
      id: true,
      companyId: true,
      status: true,
      title: true,
      hourlyRate: true,
    },
  })
  if (!sosRequest) {
    return NextResponse.json({ error: "존재하지 않는 요청입니다." }, { status: 404 })
  }
  if (sosRequest.companyId !== company.id) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 })
  }
  const terminalStatuses: SosStatus[] = [SosStatus.CANCELLED, SosStatus.COMPLETED]
  if (terminalStatuses.includes(sosRequest.status)) {
    return NextResponse.json({ error: "이미 완료되거나 취소된 요청입니다." }, { status: 409 })
  }

  // 4. 원래 결제 거래 조회 (환불 금액 기준)
  const originalTx = await prisma.pointTransaction.findFirst({
    where: { sosRequestId: id, type: "SOS_DEDUCT" },
    select: { accountId: true, amount: true },
  })
  const originalAmount = originalTx ? Math.abs(originalTx.amount) : 0

  // 5. 확정된 매치 조회
  const confirmedMatches = await prisma.sosMatch.findMany({
    where: { sosRequestId: id, status: SosMatchStatus.CONFIRMED },
    select: {
      id: true,
      workerProfile: {
        select: { id: true, userId: true },
      },
    },
  })

  const confirmedCount = confirmedMatches.length

  // 6. 포인트 환불 및 위약금 처리
  const companyPointAccount = await prisma.pointAccount.findFirst({
    where: { userId: session.user.id },
  })

  if (confirmedCount === 0) {
    // 확정 인력 없음 — 전액 환불
    await prisma.$transaction(async (tx) => {
      // SOS 상태 취소
      await tx.sosRequest.update({
        where: { id },
        data: { status: SosStatus.CANCELLED },
      })

      // 모든 매치 상태를 REJECTED로 전환 (일정 차단 해제)
      await tx.sosMatch.updateMany({
        where: { sosRequestId: id },
        data: { status: SosMatchStatus.REJECTED },
      })

      // 전액 환불
      if (originalAmount > 0 && companyPointAccount) {
        await tx.pointAccount.update({
          where: { id: companyPointAccount.id },
          data: { balance: { increment: originalAmount } },
        })
        await tx.pointTransaction.create({
          data: {
            accountId: companyPointAccount.id,
            amount: originalAmount,
            type: "CANCEL_REFUND",
            description: `SOS 취소 전액 환불: ${sosRequest.title}`,
            sosRequestId: id,
          },
        })
      }
    })

    return NextResponse.json({ cancelled: true, refunded: originalAmount, penalty: 0 })
  }

  // 확정 인력 있음 — 인당 인건비의 10% 위약금
  const penaltyPerWorker = Math.ceil(sosRequest.hourlyRate * 0.1)
  const totalPenalty = confirmedCount * penaltyPerWorker
  const companyRefund = Math.max(0, originalAmount - totalPenalty)

  // 각 확정 워커의 포인트 계정 조회 또는 생성
  const workerUserIds = confirmedMatches.map((m) => m.workerProfile.userId)
  const existingWorkerAccounts = await prisma.pointAccount.findMany({
    where: { userId: { in: workerUserIds } },
    select: { id: true, userId: true },
  })
  const workerAccountMap = new Map(existingWorkerAccounts.map((a) => [a.userId, a.id]))

  await prisma.$transaction(async (tx) => {
    // SOS 상태 취소
    await tx.sosRequest.update({
      where: { id },
      data: { status: SosStatus.CANCELLED },
    })

    // 모든 매치 상태를 REJECTED로 전환 (일정 차단 해제)
    await tx.sosMatch.updateMany({
      where: { sosRequestId: id },
      data: { status: SosMatchStatus.REJECTED },
    })

    // 업체 부분 환불
    if (companyRefund > 0 && companyPointAccount) {
      await tx.pointAccount.update({
        where: { id: companyPointAccount.id },
        data: { balance: { increment: companyRefund } },
      })
      await tx.pointTransaction.create({
        data: {
          accountId: companyPointAccount.id,
          amount: companyRefund,
          type: "CANCEL_REFUND",
          description: `SOS 취소 부분 환불 (위약금 ${totalPenalty.toLocaleString()}원 차감): ${sosRequest.title}`,
          sosRequestId: id,
        },
      })
    }

    // 각 확정 워커에게 위약금 지급
    for (const match of confirmedMatches) {
      const workerUserId = match.workerProfile.userId
      let accountId = workerAccountMap.get(workerUserId)

      if (!accountId) {
        // 포인트 계정이 없으면 생성
        const newAccount = await tx.pointAccount.create({
          data: { userId: workerUserId, balance: 0 },
        })
        accountId = newAccount.id
      }

      await tx.pointAccount.update({
        where: { id: accountId },
        data: { balance: { increment: penaltyPerWorker } },
      })
      await tx.pointTransaction.create({
        data: {
          accountId,
          amount: penaltyPerWorker,
          type: "CANCEL_COMPENSATION",
          description: `SOS 취소 위약금 보상 (인건비의 10%): ${sosRequest.title}`,
          sosRequestId: id,
        },
      })
    }
  })

  // 확정 워커에게 취소 알림 발송
  await createNotifications(
    confirmedMatches.map((m) => ({
      userId: m.workerProfile.userId,
      sosRequestId: id,
      type: "SOS_CANCELLED",
      title: "SOS 요청 취소 안내",
      body: `'${sosRequest.title}' 요청이 업체에 의해 취소되었습니다. 위약금 ${penaltyPerWorker.toLocaleString()}P가 포인트로 지급되었습니다.`,
    }))
  )

  return NextResponse.json({
    cancelled: true,
    refunded: companyRefund,
    penalty: totalPenalty,
    penaltyPerWorker,
    confirmedCount,
  })
}
