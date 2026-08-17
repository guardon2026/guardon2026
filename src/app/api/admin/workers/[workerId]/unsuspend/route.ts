export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { createNotifications } from "@/lib/notify"

// POST /api/admin/workers/[workerId]/unsuspend
// 관리자가 노쇼 누적으로 정지된 경비 인력 계정을 해제합니다.
// 노쇼 카운트도 0으로 초기화 — 그대로 두면 해제 직후 노쇼 1회만 더 발생해도 즉시 재정지되므로.

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ workerId: string }> }
) {
  const session = await getServerSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 })
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "접근 권한이 없습니다." }, { status: 403 })
  }

  const { workerId } = await params

  const existing = await prisma.workerProfile.findUnique({
    where: { id: workerId },
    select: { id: true, userId: true, suspendedAt: true },
  })
  if (!existing) {
    return NextResponse.json({ error: "경비 인력을 찾을 수 없습니다." }, { status: 404 })
  }
  if (!existing.suspendedAt) {
    return NextResponse.json({ error: "정지 상태가 아닙니다." }, { status: 409 })
  }

  await prisma.workerProfile.update({
    where: { id: workerId },
    data: { suspendedAt: null, noShowCount: 0 },
  })

  await createNotifications([
    {
      userId: existing.userId,
      type: "SUSPENSION_LIFTED",
      title: "서비스 이용 정지 해제",
      body: "관리자에 의해 서비스 이용 정지가 해제되었습니다. 다시 SOS를 신청·수락하실 수 있습니다.",
    },
  ])

  return NextResponse.json({ success: true })
}
