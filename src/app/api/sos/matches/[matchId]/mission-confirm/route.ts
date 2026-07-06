import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "@/lib/session"
import { UserRole, SosMatchStatus, SosStatus, AvailabilityStatus } from "@prisma/client"
import { createNotifications } from "@/lib/notify"

// POST /api/sos/matches/[matchId]/mission-confirm
// 업체 대표가 경비 인력의 임무 완료 보고를 확인합니다.

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  const { matchId } = await params

  const session = await getServerSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 })
  }
  if (session.user.role !== UserRole.COMPANY_OWNER) {
    return NextResponse.json({ error: "업체 대표 계정만 확인할 수 있습니다." }, { status: 403 })
  }

  const match = await prisma.sosMatch.findUnique({
    where: { id: matchId },
    include: {
      sosRequest: {
        include: {
          company: { select: { ownerId: true } },
        },
      },
      workerProfile: {
        select: { id: true, userId: true, user: { select: { name: true } } },
      },
    },
  })

  if (!match) {
    return NextResponse.json({ error: "매치 정보를 찾을 수 없습니다." }, { status: 404 })
  }
  if (match.sosRequest.company.ownerId !== session.user.id) {
    return NextResponse.json({ error: "접근 권한이 없습니다." }, { status: 403 })
  }
  if (match.status !== SosMatchStatus.CONFIRMED) {
    return NextResponse.json({ error: "확정된 매치만 완료 확인할 수 있습니다." }, { status: 409 })
  }
  if (!match.missionReportedAt) {
    return NextResponse.json({ error: "경비 인력이 아직 임무 완료 보고를 하지 않았습니다." }, { status: 409 })
  }

  const sosRequestId = match.sosRequest.id
  const workerProfileId = match.workerProfile.id
  const workerUserId = match.workerProfile.userId
  const workerName = match.workerProfile.user.name ?? "경비 인력"
  const sosTitle = match.sosRequest.title

  // SOS → COMPLETED, 워커 → AVAILABLE
  await prisma.$transaction([
    prisma.sosRequest.update({
      where: { id: sosRequestId },
      data: { status: SosStatus.COMPLETED },
    }),
    prisma.workerProfile.update({
      where: { id: workerProfileId },
      data: { availability: AvailabilityStatus.AVAILABLE },
    }),
  ])

  // 경비 인력에게 완료 확인 알림
  await createNotifications([
    {
      userId: workerUserId,
      sosRequestId,
      type: "MISSION_CONFIRMED",
      title: "임무 완료 확인",
      body: `${sosTitle} 현장의 임무 완료가 업체 대표에 의해 확인됐습니다. 수고하셨습니다!`,
    },
  ])

  return NextResponse.json({ success: true })
}
