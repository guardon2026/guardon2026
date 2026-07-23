export const dynamic = 'force-dynamic'
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "@/lib/session"
import { UserRole, Prisma } from "@prisma/client"

// GET /api/points/last-receipt ???…ì²´ ?€?œì˜ ê°€??ìµœê·¼ ì¶©ì „ ?ìˆ˜ì¦??•ë³´ ë°˜í™˜
export async function GET() {
  const session = await getServerSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "ë¡œê·¸?¸ì´ ?„ìš”?©ë‹ˆ??" }, { status: 401 })
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
