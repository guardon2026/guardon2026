import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "@/lib/session"
import { UserRole, SosMatchStatus } from "@prisma/client"

// ─────────────────────────────────────────
// POST /api/sos/matches/[matchId]/reject
// 경비 인력이 SOS 요청을 거절합니다.
// ─────────────────────────────────────────

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  const { matchId } = await params

  // 1. 인증 확인 (WORKER 역할 필요)
  const session = await getServerSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 })
  }
  if (session.user.role !== UserRole.WORKER) {
    return NextResponse.json({ error: "경비 인력 계정만 거절할 수 있습니다." }, { status: 403 })
  }

  // 2. 매치 조회
  const match = await prisma.sosMatch.findUnique({
    where: { id: matchId },
    include: {
      workerProfile: { select: { userId: true } },
    },
  })

  if (!match) {
    return NextResponse.json({ error: "매치 정보를 찾을 수 없습니다." }, { status: 404 })
  }

  // 3. 소유권 확인 (본인의 매치인지)
  if (match.workerProfile.userId !== session.user.id) {
    return NextResponse.json({ error: "접근 권한이 없습니다." }, { status: 403 })
  }

  // 4. 상태 확인 (NOTIFIED 상태만 거절 가능)
  if (match.status !== SosMatchStatus.NOTIFIED) {
    return NextResponse.json(
      { error: "이미 처리된 요청입니다. 수락 또는 거절이 완료된 매치는 변경할 수 없습니다." },
      { status: 409 }
    )
  }

  // 5. 상태 업데이트: REJECTED
  const updated = await prisma.sosMatch.update({
    where: { id: matchId },
    data: {
      status: SosMatchStatus.REJECTED,
      respondedAt: new Date(),
    },
  })

  return NextResponse.json({ match: updated })
}
