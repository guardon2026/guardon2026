export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "@/lib/session"
import { UserRole } from "@prisma/client"

// POST /api/points/self-charge ??? ì? ?ê? ?¬ì¸??ì¶©ì „ (ê²°ì œ ?œë??ˆì´??
export async function POST(req: NextRequest) {
  const session = await getServerSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "ë¡œê·¸?¸ì´ ?„ìš”?©ë‹ˆ??" }, { status: 401 })
  }
  if (!session.user.role || session.user.role === UserRole.ADMIN) {
    return NextResponse.json({ error: "ì¶©ì „ ê¶Œí•œ???†ìŠµ?ˆë‹¤." }, { status: 403 })
  }

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: "?˜ëª»???”ì²­ ?•ì‹?…ë‹ˆ??" }, { status: 400 })
  }

  const { amount, receiptInfo } = body as Record<string, unknown>
  if (typeof amount !== "number" || !Number.isInteger(amount) || amount < 1000) {
    return NextResponse.json({ error: "1,000P ?´ìƒ ?•ìˆ˜ ê¸ˆì•¡???…ë ¥??ì£¼ì„¸??" }, { status: 400 })
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
        description: `?¬ì¸??ì¶©ì „ ${amount.toLocaleString()}??,
        ...(receiptInfo && typeof receiptInfo === "object" ? { receiptInfo } : {}),
      },
    }),
  ])

  return NextResponse.json({ balance: updated.balance })
}
