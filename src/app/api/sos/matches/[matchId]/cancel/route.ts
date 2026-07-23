export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "@/lib/session"
import { UserRole, SosMatchStatus } from "@prisma/client"
import { createNotifications } from "@/lib/notify"

// POST /api/sos/matches/[matchId]/cancel
// 경비 인력이 수락한 SOS 매치를 취소합니다.
// - 수락 후 1시간 이내: 보증 포인트 전액 환불
// - 1시간 초과: 보증 포인트 업체 대표에게 취소 수수료로 지급

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

  // 1시간 이내 취소 여부 확인 (respondedAt = 수락 시각)
  const acceptedAt = match.respondedAt ?? match.notifiedAt
  const elapsedMs = Date.now() - new Date(acceptedAt).getTime()
  const withinOneHour = elapsedMs <= 60 * 60 * 1000

  // 경비 인력이 납부한 보증 포인트 거래 조회
  const workerAccount = await prisma.pointAccount.findUnique({
    where: { userId: session.user.id },
  })
  const workerDeductTx = await prisma.pointTransaction.findFirst({
    where: { sosRequestId, type: "WORKER_DEDUCT", accountId: workerAccount?.id },
  })
  const workerFee = workerDeductTx ? Math.abs(workerDeductTx.amount) : 0

  // 업체 대표 포인트 계정
  const companyAccount = await prisma.pointAccount.findUnique({
    where: { userId: companyOwnerId },
  })

  await prisma.$transaction(async (tx) => {
    // 매치 상태 → REJECTED (취소)
    await tx.sosMatch.update({
      where: { id: matchId },
      data: { status: SosMatchStatus.REJECTED, respondedAt: new Date() },
    })

    // 워커 availability 복원
    await tx.workerProfile.update({
      where: { id: match.workerProfile.id },
      data: { availability: "AVAILABLE" },
    })

    if (workerFee > 0 && workerAccount) {
      if (withinOneHour) {
        // 1시간 이내: 경비 인력에게 보증 포인트 전액 환불
        await tx.pointAccount.update({
          where: { id: workerAccount.id },
          data: { balance: { increment: workerFee } },
        })
        await tx.pointTransaction.create({
          data: {
            accountId: workerAccount.id,
            amount: workerFee,
            type: "REFUND",
            description: `SOS 수락 취소 환불 (1시간 이내): ${sosTitle}`,
            sosRequestId,
          },
        })
      } else {
        // 1시간 초과: 보증 포인트 → 업체 대표에게 취소 수수료로 지급
        if (companyAccount) {
          await tx.pointAccount.update({
            where: { id: companyAccount.id },
            data: { balance: { increment: workerFee } },
          })
          await tx.pointTransaction.create({
            data: {
              accountId: companyAccount.id,
              amount: workerFee,
              type: "CANCEL_COMPENSATION",
              description: `경비 인력 취소 수수료 수취 (1시간 초과): ${sosTitle}`,
              sosRequestId,
            },
          })
        }
      }
    }
  })

  // 알림 발송
  const notifs = []

  if (withinOneHour) {
    // 경비 인력 본인: 취소 완료 + 환불 안내
    notifs.push({
      userId: session.user.id,
      sosRequestId,
      type: "SYSTEM_NOTICE",
      title: "SOS 수락 취소 완료",
      body: workerFee > 0
        ? `'${sosTitle}' 수락을 취소했습니다. 보증 포인트 ${workerFee.toLocaleString()}P가 환불되었습니다.`
        : `'${sosTitle}' 수락을 취소했습니다.`,
    })
    // 업체 대표: 취소 통보
    notifs.push({
      userId: companyOwnerId,
      sosRequestId,
      type: "MATCH_CANCELLED",
      title: "SOS 수락 취소 알림",
      body: `'${sosTitle}' 요청의 경비 인력이 수락을 취소했습니다. (1시간 이내 취소)`,
    })
  } else {
    // 경비 인력 본인: 취소 완료 + 수수료 안내
    notifs.push({
      userId: session.user.id,
      sosRequestId,
      type: "SYSTEM_NOTICE",
      title: "SOS 수락 취소 완료",
      body: workerFee > 0
        ? `'${sosTitle}' 수락을 취소했습니다. 1시간 초과로 보증 포인트 ${workerFee.toLocaleString()}P가 업체에 취소 수수료로 지급되었습니다.`
        : `'${sosTitle}' 수락을 취소했습니다.`,
    })
    // 업체 대표: 취소 통보 + 수수료 수취 안내
    notifs.push({
      userId: companyOwnerId,
      sosRequestId,
      type: "MATCH_CANCELLED",
      title: "SOS 수락 취소 알림",
      body: workerFee > 0
        ? `'${sosTitle}' 요청의 경비 인력이 수락을 취소했습니다. 취소 수수료 ${workerFee.toLocaleString()}P가 지급되었습니다.`
        : `'${sosTitle}' 요청의 경비 인력이 수락을 취소했습니다.`,
    })
  }

  await createNotifications(notifs)

  return NextResponse.json({ cancelled: true, withinOneHour, refunded: withinOneHour ? workerFee : 0 })
}
