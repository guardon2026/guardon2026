export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "@/lib/session"
import { UserRole } from "@prisma/client"

// POST /api/points/withdraw
export async function POST(req: NextRequest) {
  const session = await getServerSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "ë¡œê·¸?¸ì´ ?„ìš”?©ë‹ˆ??" }, { status: 401 })
  }
  if (session.user.role !== UserRole.WORKER && session.user.role !== UserRole.COMPANY_OWNER) {
    return NextResponse.json({ error: "ì¶œê¸ˆ ê¶Œí•œ???†ìŠµ?ˆë‹¤." }, { status: 403 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "?˜ëª»???”ì²­ ?•ì‹?…ë‹ˆ??" }, { status: 400 })
  }

  const { amount, realName, residentNumber, bankName, accountNumber, accountHolder } = body as Record<string, unknown>

  if (typeof amount !== "number" || amount < 1000 || !Number.isInteger(amount)) {
    return NextResponse.json({ error: "ì¶œê¸ˆ ê¸ˆì•¡?€ ìµœì†Œ 1,000P ?´ìƒ?´ì–´???©ë‹ˆ??" }, { status: 400 })
  }

  // ê²½ë¹„ ?¸ë ¥???Œë§Œ ?¸ê¸ˆ ? ê³  ?•ë³´ ?„ìˆ˜
  if (session.user.role === UserRole.WORKER) {
    if (typeof realName !== "string" || !realName.trim()) {
      return NextResponse.json({ error: "?¤ëª…???…ë ¥??ì£¼ì„¸??" }, { status: 400 })
    }
    if (typeof residentNumber !== "string" || residentNumber.replace(/\D/g, "").length !== 13) {
      return NextResponse.json({ error: "ì£¼ë??±ë¡ë²ˆí˜¸ 13?ë¦¬ë¥??…ë ¥??ì£¼ì„¸??" }, { status: 400 })
    }
  }

  if (typeof bankName !== "string" || !bankName.trim()) {
    return NextResponse.json({ error: "?€?‰ëª…???…ë ¥??ì£¼ì„¸??" }, { status: 400 })
  }
  if (typeof accountNumber !== "string" || !accountNumber.trim()) {
    return NextResponse.json({ error: "ê³„ì¢Œë²ˆí˜¸ë¥??…ë ¥??ì£¼ì„¸??" }, { status: 400 })
  }
  if (typeof accountHolder !== "string" || !accountHolder.trim()) {
    return NextResponse.json({ error: "?ˆê¸ˆì£¼ëª…???…ë ¥??ì£¼ì„¸??" }, { status: 400 })
  }

  const account = await prisma.pointAccount.findUnique({
    where: { userId: session.user.id },
  })
  if (!account) {
    return NextResponse.json({ error: "?¬ì¸??ê³„ì •??ì°¾ì„ ???†ìŠµ?ˆë‹¤." }, { status: 404 })
  }
  if (account.balance < amount) {
    return NextResponse.json(
      { error: `?¬ì¸?¸ê? ë¶€ì¡±í•©?ˆë‹¤. ë³´ìœ : ${account.balance.toLocaleString()}P` },
      { status: 402 }
    )
  }

  await prisma.$transaction([
    prisma.pointAccount.update({
      where: { id: account.id },
      data: { balance: { decrement: amount } },
    }),
    prisma.pointTransaction.create({
      data: {
        accountId: account.id,
        amount: -amount,
        type: "WITHDRAWAL",
        description: session.user.role === UserRole.WORKER && typeof realName === "string"
          ? `ì¶œê¸ˆ ? ì²­: ${bankName.trim()} ${accountNumber.trim()} (${accountHolder.trim()}) / ?¤ëª…: ${realName.trim()} / ì£¼ë?ë²ˆí˜¸: ${(residentNumber as string).slice(0, 6)}-*******`
          : `ì¶œê¸ˆ ? ì²­: ${bankName.trim()} ${accountNumber.trim()} (${accountHolder.trim()})`,
      },
    }),
  ])

  return NextResponse.json({ ok: true, amount })
}
