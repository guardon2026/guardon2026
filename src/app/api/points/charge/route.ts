export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "@/lib/session"
import { UserRole } from "@prisma/client"

// POST /api/points/charge ??관리자가 ?��??�게 ?�인??충전
export async function POST(req: NextRequest) {
  const session = await getServerSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그?�이 ?�요?�니??" }, { status: 401 })
  }
  if (session.user.role !== UserRole.ADMIN) {
    return NextResponse.json({ error: "관리자�??�인?��? 충전?????�습?�다." }, { status: 403 })
  }

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: "?�못???�청 ?�식?�니??" }, { status: 400 })
  }

  const { userId, amount, description } = body as Record<string, unknown>
  if (typeof userId !== "string" || !userId) {
    return NextResponse.json({ error: "userId가 ?�요?�니??" }, { status: 400 })
  }
  if (typeof amount !== "number" || amount <= 0 || !Number.isInteger(amount)) {
    return NextResponse.json({ error: "amount???�의 ?�수?�야 ?�니??" }, { status: 400 })
  }
  const desc = typeof description === "string" && description.trim()
    ? description.trim()
    : "관리자 ?�인??충전"

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
