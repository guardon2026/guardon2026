export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { getServerSession } from "@/lib/session"
import { prisma } from "@/lib/prisma"

export async function PATCH(req: NextRequest) {
  const session = await getServerSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 })
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "관리자 계정만 접근할 수 있습니다." }, { status: 403 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "잘못된 요청 형식입니다." }, { status: 400 })
  }
  const { currentPassword, newPassword } = body as Record<string, unknown>

  if (typeof newPassword !== "string" || newPassword.length < 8) {
    return NextResponse.json({ error: "새 비밀번호는 8자 이상이어야 합니다." }, { status: 400 })
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id, deletedAt: null },
    select: { id: true, password: true },
  })
  if (!user) {
    return NextResponse.json({ error: "사용자를 찾을 수 없습니다." }, { status: 404 })
  }

  // 기존 비밀번호가 설정되어 있으면 현재 비밀번호 확인 필수
  if (user.password) {
    if (typeof currentPassword !== "string" || !currentPassword) {
      return NextResponse.json({ error: "현재 비밀번호를 입력해 주세요." }, { status: 400 })
    }
    const valid = await bcrypt.compare(currentPassword, user.password)
    if (!valid) {
      return NextResponse.json({ error: "현재 비밀번호가 올바르지 않습니다." }, { status: 400 })
    }
  }

  const hash = await bcrypt.hash(newPassword, 10)
  await prisma.user.update({
    where: { id: user.id },
    data: { password: hash },
  })

  return NextResponse.json({ ok: true })
}
