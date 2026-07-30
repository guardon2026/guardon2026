export const dynamic = 'force-dynamic'
import { NextResponse } from "next/server"
import { getServerSession } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { signOut } from "@/lib/auth"

export async function DELETE() {
  const session = await getServerSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 })
  }

  const userId = session.user.id

  // 진행 중인 SOS 요청이 있으면 탈퇴 차단
  const activeCompany = await prisma.company.findUnique({
    where: { ownerId: userId },
    select: { id: true },
  })
  if (activeCompany) {
    const activeSos = await prisma.sosRequest.count({
      where: {
        companyId: activeCompany.id,
        status: { notIn: ["CANCELLED", "COMPLETED"] },
      },
    })
    if (activeSos > 0) {
      return NextResponse.json(
        { error: "진행 중인 SOS 요청이 있어 탈퇴할 수 없습니다. 모든 요청을 완료하거나 취소한 후 다시 시도해 주세요." },
        { status: 409 }
      )
    }
  }

  // soft-delete: deletedAt 설정 + role 초기화
  await prisma.user.update({
    where: { id: userId },
    data: {
      deletedAt: new Date(),
      role: null,
      name: "탈퇴한 사용자",
      email: null,
      image: null,
    },
  })

  // NextAuth 세션 삭제
  await signOut({ redirect: false })

  return NextResponse.json({ ok: true })
}
