export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "@/lib/session"
import { UserRole } from "@prisma/client"

// POST /api/points/self-charge — 유저 자가 포인트 충전 (결제 시뮬레이션)
export async function POST(req: NextRequest) {
  const session = await getServerSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 })
  }
  if (!session.user.role || session.user.role === UserRole.ADMIN) {
    return NextResponse.json({ error: "충전 권한이 없습니다." }, { status: 403 })
  }

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: "잘못된 요청 형식입니다." }, { status: 400 })
  }

  const { amount, receiptInfo } = body as Record<string, unknown>
  if (typeof amount !== "number" || !Number.isInteger(amount) || amount < 1000) {
    return NextResponse.json({ error: "1,000P 이상 정수 금액을 입력해 주세요." }, { status: 400 })
  }

  const account = await prisma.pointAccount.upsert({
    where: { userId: session.user.id },
    create: { userId: session.user.id, balance: 0 },
    update: {},
  })

  const [updated] = await prisma.$transaction([
    prisma.pointAccount.update({
      where: { id: account.id },
      data: { balance: { increment: amount } },
    }),
    prisma.pointTransaction.create({
      data: {
        accountId: account.id,
        amount,
        type: "SELF_CHARGE",
        description: `포인트 충전 ${amount.toLocaleString()}원`,
        ...(receiptInfo && typeof receiptInfo === "object" ? { receiptInfo } : {}),
      },
    }),
  ])

  return NextResponse.json({ balance: updated.balance })
}
