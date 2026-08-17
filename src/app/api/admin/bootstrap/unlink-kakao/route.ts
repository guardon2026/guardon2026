export const dynamic = 'force-dynamic'
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { UserRole } from "@prisma/client"

/**
 * 관리자 계정에 잘못 연동된 카카오 OAuth Account 링크를 해제한다.
 * User.role/password는 전혀 건드리지 않는다 — NextAuth Account 테이블(provider=kakao)
 * 행만 삭제해서, 이후 그 카카오 계정으로 로그인하면 더 이상 이 관리자 User와 연결되지 않고
 * 새 일반 회원 가입 절차를 타게 된다.
 * ADMIN_BOOTSTRAP_TOKEN과 일치하는 토큰 + 대상 email이 현재 유일한 ADMIN 계정과
 * 정확히 일치할 때만 동작한다.
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

  const email = typeof body?.email === "string" ? body.email.trim() : ""
  if (!email) {
    return NextResponse.json({ error: "이메일을 입력해 주세요." }, { status: 400 })
  }

  const admins = await prisma.user.findMany({
    where: { role: UserRole.ADMIN },
    select: { id: true, email: true },
  })

  if (admins.length !== 1 || admins[0].email !== email) {
    return NextResponse.json(
      { error: "현재 유일한 관리자 계정의 이메일과 정확히 일치할 때만 해제할 수 있습니다." },
      { status: 409 }
    )
  }

  const result = await prisma.account.deleteMany({
    where: { userId: admins[0].id, provider: "kakao" },
  })

  return NextResponse.json({ ok: true, unlinkedCount: result.count })
}
