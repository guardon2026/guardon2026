import { NextResponse } from "next/server"
import { getServerSession } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { UserRole } from "@prisma/client"

// 주민등록번호 형식 검증 (YYMMDD-NNNNNNN)
function validateRrn(rrn: string): boolean {
  const cleaned = rrn.replace(/-/g, "")
  if (!/^\d{13}$/.test(cleaned)) return false
  const genderDigit = parseInt(cleaned[6])
  return [1, 2, 3, 4].includes(genderDigit)
}

// 뒷자리 마스킹: 900101-1****** 형태로 저장
function maskRrn(rrn: string): string {
  const cleaned = rrn.replace(/-/g, "")
  return `${cleaned.slice(0, 6)}-${cleaned[6]}******`
}

export async function PATCH(req: Request) {
  const session = await getServerSession()
  if (!session?.user?.id || session.user.role !== UserRole.WORKER) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json()
  const { type, rrn, bankName, bankAccount, bankHolder } = body

  const profile = await prisma.workerProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  })
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 })

  if (type === "rrn") {
    if (!rrn || !validateRrn(rrn)) {
      return NextResponse.json({ error: "주민등록번호 형식이 올바르지 않습니다." }, { status: 400 })
    }
    const updated = await prisma.workerProfile.update({
      where: { id: profile.id },
      data: { rrn: maskRrn(rrn), rrnVerifiedAt: new Date() },
      select: { rrn: true, rrnVerifiedAt: true },
    })
    return NextResponse.json(updated)
  }

  if (type === "bank") {
    if (!bankName || !bankAccount || !bankHolder) {
      return NextResponse.json({ error: "모든 계좌 정보를 입력해 주세요." }, { status: 400 })
    }
    if (!/^\d{10,14}$/.test(bankAccount.replace(/-/g, ""))) {
      return NextResponse.json({ error: "계좌번호 형식이 올바르지 않습니다." }, { status: 400 })
    }
    const updated = await prisma.workerProfile.update({
      where: { id: profile.id },
      data: { bankName, bankAccount, bankHolder, bankVerifiedAt: new Date() },
      select: { bankName: true, bankAccount: true, bankHolder: true, bankVerifiedAt: true },
    })
    return NextResponse.json(updated)
  }

  return NextResponse.json({ error: "Invalid type" }, { status: 400 })
}
