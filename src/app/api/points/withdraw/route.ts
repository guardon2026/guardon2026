import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "@/lib/session"
import { UserRole } from "@prisma/client"

// POST /api/points/withdraw
export async function POST(req: NextRequest) {
  const session = await getServerSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 })
  }
  if (session.user.role !== UserRole.WORKER && session.user.role !== UserRole.COMPANY_OWNER) {
    return NextResponse.json({ error: "출금 권한이 없습니다." }, { status: 403 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "잘못된 요청 형식입니다." }, { status: 400 })
  }

  const { amount, realName, residentNumber, bankName, accountNumber, accountHolder } = body as Record<string, unknown>

  if (typeof amount !== "number" || amount < 1000 || !Number.isInteger(amount)) {
    return NextResponse.json({ error: "출금 금액은 최소 1,000P 이상이어야 합니다." }, { status: 400 })
  }

  // 경비 인력일 때만 세금 신고 정보 필수
  if (session.user.role === UserRole.WORKER) {
    if (typeof realName !== "string" || !realName.trim()) {
      return NextResponse.json({ error: "실명을 입력해 주세요." }, { status: 400 })
    }
    if (typeof residentNumber !== "string" || residentNumber.replace(/\D/g, "").length !== 13) {
      return NextResponse.json({ error: "주민등록번호 13자리를 입력해 주세요." }, { status: 400 })
    }
  }

  if (typeof bankName !== "string" || !bankName.trim()) {
    return NextResponse.json({ error: "은행명을 입력해 주세요." }, { status: 400 })
  }
  if (typeof accountNumber !== "string" || !accountNumber.trim()) {
    return NextResponse.json({ error: "계좌번호를 입력해 주세요." }, { status: 400 })
  }
  if (typeof accountHolder !== "string" || !accountHolder.trim()) {
    return NextResponse.json({ error: "예금주명을 입력해 주세요." }, { status: 400 })
  }

  const account = await prisma.pointAccount.findUnique({
    where: { userId: session.user.id },
  })
  if (!account) {
    return NextResponse.json({ error: "포인트 계정을 찾을 수 없습니다." }, { status: 404 })
  }
  if (account.balance < amount) {
    return NextResponse.json(
      { error: `포인트가 부족합니다. 보유: ${account.balance.toLocaleString()}P` },
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
          ? `출금 신청: ${bankName.trim()} ${accountNumber.trim()} (${accountHolder.trim()}) / 실명: ${realName.trim()} / 주민번호: ${(residentNumber as string).slice(0, 6)}-*******`
          : `출금 신청: ${bankName.trim()} ${accountNumber.trim()} (${accountHolder.trim()})`,
      },
    }),
  ])

  return NextResponse.json({ ok: true, amount })
}
