export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "@/lib/session"
import { UserRole } from "@prisma/client"

// POST /api/points/withdraw
export async function POST(req: NextRequest) {
  const session = await getServerSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그?�이 ?�요?�니??" }, { status: 401 })
  }
  if (session.user.role !== UserRole.WORKER && session.user.role !== UserRole.COMPANY_OWNER) {
    return NextResponse.json({ error: "출금 권한???�습?�다." }, { status: 403 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "?�못???�청 ?�식?�니??" }, { status: 400 })
  }

  const { amount, realName, residentNumber, bankName, accountNumber, accountHolder } = body as Record<string, unknown>

  if (typeof amount !== "number" || amount < 1000 || !Number.isInteger(amount)) {
    return NextResponse.json({ error: "출금 금액?� 최소 1,000P ?�상?�어???�니??" }, { status: 400 })
  }

  // 경비 ?�력???�만 ?�금 ?�고 ?�보 ?�수
  if (session.user.role === UserRole.WORKER) {
    if (typeof realName !== "string" || !realName.trim()) {
      return NextResponse.json({ error: "?�명???�력??주세??" }, { status: 400 })
    }
    if (typeof residentNumber !== "string" || residentNumber.replace(/\D/g, "").length !== 13) {
      return NextResponse.json({ error: "주�??�록번호 13?�리�??�력??주세??" }, { status: 400 })
    }
  }

  if (typeof bankName !== "string" || !bankName.trim()) {
    return NextResponse.json({ error: "?�?�명???�력??주세??" }, { status: 400 })
  }
  if (typeof accountNumber !== "string" || !accountNumber.trim()) {
    return NextResponse.json({ error: "계좌번호�??�력??주세??" }, { status: 400 })
  }
  if (typeof accountHolder !== "string" || !accountHolder.trim()) {
    return NextResponse.json({ error: "?�금주명???�력??주세??" }, { status: 400 })
  }

  const account = await prisma.pointAccount.findUnique({
    where: { userId: session.user.id },
  })
  if (!account) {
    return NextResponse.json({ error: "?�인??계정??찾을 ???�습?�다." }, { status: 404 })
  }
  if (account.balance < amount) {
    return NextResponse.json(
      { error: `?�인?��? 부족합?�다. 보유: ${account.balance.toLocaleString()}P` },
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
          ? `출금 ?�청: ${bankName.trim()} ${accountNumber.trim()} (${accountHolder.trim()}) / ?�명: ${realName.trim()} / 주�?번호: ${(residentNumber as string).slice(0, 6)}-*******`
          : `출금 ?�청: ${bankName.trim()} ${accountNumber.trim()} (${accountHolder.trim()})`,
      },
    }),
  ])

  return NextResponse.json({ ok: true, amount })
}
