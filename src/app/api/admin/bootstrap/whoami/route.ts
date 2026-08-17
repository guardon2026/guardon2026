export const dynamic = 'force-dynamic'
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { UserRole } from "@prisma/client"

/**
 * 읽기 전용 — 현재 ADMIN 역할 계정의 이메일만 조회한다 (비밀번호는 절대 포함하지 않음).
 * ADMIN_BOOTSTRAP_TOKEN과 일치하는 토큰이 있어야만 동작 — 계정 존재 여부를 확인하고
 * 접근을 잃은 관리자 계정을 찾기 위한 용도.
 */
export async function POST(req: Request) {
  const bootstrapToken = process.env.ADMIN_BOOTSTRAP_TOKEN
  if (!bootstrapToken) {
    return NextResponse.json({ error: "부트스트랩이 비활성화되어 있습니다." }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  if (body?.token !== bootstrapToken) {
    return NextResponse.json({ error: "토큰이 올바르지 않습니다." }, { status: 403 })
  }

  const admins = await prisma.user.findMany({
    where: { role: UserRole.ADMIN },
    select: { email: true, name: true, createdAt: true, phone: true, kakaoId: true },
    orderBy: { createdAt: "asc" },
  })

  return NextResponse.json({ ok: true, count: admins.length, admins })
}
