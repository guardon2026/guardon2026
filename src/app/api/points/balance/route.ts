import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "@/lib/session"

// GET /api/points/balance — 본인 포인트 잔액 조회
export async function GET() {
  const session = await getServerSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 })
  }

  const account = await prisma.pointAccount.findUnique({
    where: { userId: session.user.id },
    include: {
      transactions: {
        orderBy: { createdAt: "desc" },
        take: 50,
      },
    },
  })

  return NextResponse.json({
    balance: account?.balance ?? 0,
    transactions: account?.transactions ?? [],
  })
}
