export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "@/lib/session"
import { UserRole, SosMatchStatus } from "@prisma/client"
import { createNotifications } from "@/lib/notify"

// ─────────────────────────────────────────
// POST /api/sos/matches/[matchId]/complete
// 경비 인력이 업무 완료를 업체 대표에게 보고합니다.
// ─────────────────────────────────────────

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  const { matchId } = await params

  const session = await getServerSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 })
  }
  if (session.user.role !== UserRole.WORKER) {
    return NextResponse.json({ error: "경비 인력 계정만 완료 보고할 수 있습니다." }, { status: 403 })
  }

  const workerProfile = await prisma.workerProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  })
  if (!workerProfile) {
    return NextResponse.json({ error: "프로필을 찾을 수 없습니다." }, { status: 404 })
  }

  const match = await prisma.sosMatch.findUnique({
    where: { id: matchId },
    include: {
      sosRequest: {
        include: {
          company: { select: { ownerId: true, name: true } },
        },
      },
    },
  })

  if (!match || match.workerProfileId !== workerProfile.id) {
    return NextResponse.json({ error: "매치 정보를 찾을 수 없습니다." }, { status: 404 })
  }

  if (match.status !== SosMatchStatus.CONFIRMED) {
    return NextResponse.json({ error: "확정된 매치만 완료 보고할 수 있습니다." }, { status: 409 })
  }

  if (match.missionReportedAt) {
    return NextResponse.json({ error: "이미 임무 완료 보고를 하셨습니다." }, { status: 409 })
  }

  const req = match.sosRequest
  const companyOwnerId = req.company.ownerId
  const workerName = session.user.name ?? "경비 인력"

  // missionReportedAt 기록
  await prisma.sosMatch.update({
    where: { id: matchId },
    data: { missionReportedAt: new Date() },
  })

  // 업체 대표에게 임무 완료 알림 발송
  await createNotifications([
    {
      userId: companyOwnerId,
      sosRequestId: req.id,
      type: "MISSION_COMPLETE",
      title: "임무 완료 보고",
      body: `${req.title} 현장에서 ${workerName}이(가) 임무 완료를 보고했습니다.`,
    },
  ])

  return NextResponse.json({ success: true })
}
