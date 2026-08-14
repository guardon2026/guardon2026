export const dynamic = 'force-dynamic'
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { UserRole } from "@prisma/client"
import bcrypt from "bcryptjs"
import { randomBytes } from "crypto"

/**
 * 최초 관리자 계정 부트스트랩 — 세션 기반 인증이 아직 없는 상태에서만 쓰는 1회성 경로.
 * ADMIN_BOOTSTRAP_TOKEN 환경변수와 정확히 일치하는 토큰이 있고, 아직 ADMIN 계정이
 * 하나도 없을 때만 동작한다. 성공 후에는 ADMIN이 존재하므로 자동으로 다시 막힌다.
 * 비밀번호는 서버에서 무작위로 생성해 응답에 1회만 포함한다 — 요청자가 직접 지정하지 않음.
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
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "올바른 이메일을 입력해 주세요." }, { status: 400 })
  }

  const existingAdminCount = await prisma.user.count({ where: { role: UserRole.ADMIN } })
  if (existingAdminCount > 0) {
    return NextResponse.json({ error: "이미 관리자 계정이 존재합니다." }, { status: 409 })
  }

  const password = randomBytes(12).toString("base64url")
  const hashed = await bcrypt.hash(password, 10)

  const user = await prisma.user.upsert({
    where: { email },
    create: { email, role: UserRole.ADMIN, name: "관리자", password: hashed },
    update: { role: UserRole.ADMIN, password: hashed },
  })

  return NextResponse.json({ ok: true, email: user.email, password })
}
