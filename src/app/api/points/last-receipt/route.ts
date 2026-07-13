import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "@/lib/session"
import { UserRole, Prisma } from "@prisma/client"

// GET /api/points/last-receipt — 업체 대표의 가장 최근 충전 영수증 정보 반환
export async function GET() {
  const session = await getServerSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 })
  }
  if (session.user.role !== UserRole.COMPANY_OWNER) {
    return NextResponse.json({ receiptInfo: null })
  }

  const account = await prisma.pointAccount.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  })
  if (!account) return NextResponse.json({ receiptInfo: null })

  const tx = await prisma.pointTransaction.findFirst({
    where: {
      accountId: account.id,
      type: "SELF_CHARGE",
      receiptInfo: { not: Prisma.JsonNull },
    },
    orderBy: { createdAt: "desc" },
    select: { receiptInfo: true, createdAt: true },
  })

  return NextResponse.json({ receiptInfo: tx?.receiptInfo ?? null, createdAt: tx?.createdAt ?? null })
}
