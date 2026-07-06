import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "@/lib/session"
import { UserRole } from "@prisma/client"

// POST /api/points/charge — 관리자가 유저에게 포인트 충전
export async function POST(req: NextRequest) {
  const session = await getServerSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 })
  }
  if (session.user.role !== UserRole.ADMIN) {
    return NextResponse.json({ error: "관리자만 포인트를 충전할 수 있습니다." }, { status: 403 })
  }

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: "잘못된 요청 형식입니다." }, { status: 400 })
  }

  const { userId, amount, description } = body as Record<string, unknown>
  if (typeof userId !== "string" || !userId) {
    return NextResponse.json({ error: "userId가 필요합니다." }, { status: 400 })
  }
  if (typeof amount !== "number" || amount <= 0 || !Number.isInteger(amount)) {
    return NextResponse.json({ error: "amount는 양의 정수여야 합니다." }, { status: 400 })
  }
  const desc = typeof description === "string" && description.trim()
    ? description.trim()
    : "관리자 포인트 충전"

  // upsert PointAccount then create transaction
  const account = await prisma.pointAccount.upsert({
    where: { userId },
    create: { userId, balance: 0 },
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
        type: "ADMIN_CHARGE",
        description: desc,
      },
    }),
  ])

  return NextResponse.json({ balance: updated.balance })
}
