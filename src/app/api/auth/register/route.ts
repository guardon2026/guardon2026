export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { UserRole } from "@prisma/client"

const CONSENT_VERSION = "1.0.0"

const RegisterSchema = z.object({
  role: z.enum(["COMPANY_OWNER", "WORKER"] as const),
  consents: z.array(z.enum(["TERMS", "PRIVACY", "LOCATION"] as const)).length(3),
})

export async function POST(req: NextRequest) {
  const session = await getServerSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 })
  }

  const body = await req.json()
  const parsed = RegisterSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 })
  }

  const { role, consents } = parsed.data
  const userId = session.user.id
  const ipAddress =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    undefined

  // 이미 역할이 설정된 사용자 재등록 방지
  const existing = await prisma.user.findUnique({
    where: { id: userId, deletedAt: null },
    select: { role: true },
  })
  if (!existing) {
    return NextResponse.json({ error: "사용자를 찾을 수 없습니다." }, { status: 404 })
  }
  // ADMIN 계정은 이 API 로 역할 변경 불가
  if (existing.role === "ADMIN") {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 })
  }

  // 역할 설정 + ConsentLog 3건 저장 (트랜잭션)
  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { role: role as UserRole },
    }),
    prisma.consentLog.createMany({
      data: consents.map((consentType) => ({
        userId,
        consentType,
        version: CONSENT_VERSION,
        ipAddress,
      })),
      skipDuplicates: true,
    }),
  ])

  return NextResponse.json({ success: true })
}
