export const dynamic = 'force-dynamic'
import { NextResponse } from "next/server"
import { getServerSession } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { UserRole } from "@prisma/client"

// ì£¼ë??±ë¡ë²ˆí˜¸ ?•ì‹ ê²€ì¦?(YYMMDD-NNNNNNN)
function validateRrn(rrn: string): boolean {
  const cleaned = rrn.replace(/-/g, "")
  if (!/^\d{13}$/.test(cleaned)) return false
  const genderDigit = parseInt(cleaned[6])
  return [1, 2, 3, 4].includes(genderDigit)
}

// ?·ìë¦?ë§ˆìŠ¤?? 900101-1****** ?•íƒœë¡??€??function maskRrn(rrn: string): string {
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
      return NextResponse.json({ error: "ì£¼ë??±ë¡ë²ˆí˜¸ ?•ì‹???¬ë°”ë¥´ì? ?ŠìŠµ?ˆë‹¤." }, { status: 400 })
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
      return NextResponse.json({ error: "ëª¨ë“  ê³„ì¢Œ ?•ë³´ë¥??…ë ¥??ì£¼ì„¸??" }, { status: 400 })
    }
    if (!/^\d{10,14}$/.test(bankAccount.replace(/-/g, ""))) {
      return NextResponse.json({ error: "ê³„ì¢Œë²ˆí˜¸ ?•ì‹???¬ë°”ë¥´ì? ?ŠìŠµ?ˆë‹¤." }, { status: 400 })
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
