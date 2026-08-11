export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "@/lib/session"
import { UserRole } from "@prisma/client"

// ─────────────────────────────────────────
// POST /api/sos/matches/[matchId]/mark-paid
// 경비 업체가 인건비 실지급 완료 여부를 표시합니다.
// ─────────────────────────────────────────

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  const { matchId } = await params

  const session = await getServerSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 })
  }
  if (session.user.role !== UserRole.COMPANY_OWNER) {
    return NextResponse.json({ error: "경비 업체 계정만 처리할 수 있습니다." }, { status: 403 })
  }

  const body = await req.json().catch(() => null)
  if (typeof body?.paid !== "boolean") {
    return NextResponse.json({ error: "paid 값이 필요합니다." }, { status: 400 })
  }

  const match = await prisma.sosMatch.findUnique({
    where: { id: matchId },
    include: {
      sosRequest: {
        include: {
          company: { select: { ownerId: true } },
        },
      },
    },
  })

  if (!match) {
    return NextResponse.json({ error: "매치 정보를 찾을 수 없습니다." }, { status: 404 })
  }

  if (match.sosRequest.company.ownerId !== session.user.id) {
    return NextResponse.json({ error: "접근 권한이 없습니다." }, { status: 403 })
  }

  if (!match.missionConfirmedAt) {
    return NextResponse.json(
      { error: "임무 완료가 확정된 매치만 지급 처리할 수 있습니다." },
      { status: 409 }
    )
  }

  const updated = await prisma.sosMatch.update({
    where: { id: matchId },
    data: { paidAt: body.paid ? new Date() : null },
  })

  return NextResponse.json({ success: true, paidAt: updated.paidAt })
}
