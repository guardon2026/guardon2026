export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from "next/server"
import { Prisma, UserRole } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "@/lib/session"
import { createNotifications } from "@/lib/notify"

// POST /api/sos/matches/[matchId]/rate
// 경비 업체가 임무 완료 확정된 경비 인력의 근무를 별점(1~5)으로 평가합니다.

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
    return NextResponse.json({ error: "경비 업체 계정만 평가할 수 있습니다." }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const score = Number(body?.score)
  if (!Number.isInteger(score) || score < 1 || score > 5) {
    return NextResponse.json({ error: "평점은 1~5 사이의 정수여야 합니다." }, { status: 400 })
  }
  const comment = typeof body?.comment === "string" ? body.comment.trim().slice(0, 500) : null

  const match = await prisma.sosMatch.findUnique({
    where: { id: matchId },
    include: {
      sosRequest: {
        include: {
          company: { select: { id: true, ownerId: true } },
        },
      },
      workerProfile: { select: { id: true, userId: true } },
      rating: { select: { id: true } },
    },
  })

  if (!match) {
    return NextResponse.json({ error: "매치 정보를 찾을 수 없습니다." }, { status: 404 })
  }
  if (match.sosRequest.company.ownerId !== session.user.id) {
    return NextResponse.json({ error: "접근 권한이 없습니다." }, { status: 403 })
  }
  if (!match.missionConfirmedAt) {
    return NextResponse.json({ error: "임무 완료가 확정된 매칭만 평가할 수 있습니다." }, { status: 409 })
  }
  if (match.rating) {
    return NextResponse.json({ error: "이미 평가를 남긴 매칭입니다." }, { status: 409 })
  }

  const companyId = match.sosRequest.company.id
  const workerProfileId = match.workerProfile.id
  const workerUserId = match.workerProfile.userId
  const sosRequestId = match.sosRequest.id
  const sosTitle = match.sosRequest.title

  try {
    await prisma.$transaction(async (tx) => {
      await tx.rating.create({
        data: { sosMatchId: matchId, companyId, workerProfileId, score, comment },
      })

      const agg = await tx.rating.aggregate({
        where: { workerProfileId },
        _avg: { score: true },
        _count: { _all: true },
      })

      await tx.workerProfile.update({
        where: { id: workerProfileId },
        data: {
          averageRating: agg._avg.score ?? 0,
          totalMatches: agg._count._all,
        },
      })
    })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json({ error: "이미 평가를 남긴 매칭입니다." }, { status: 409 })
    }
    throw e
  }

  await createNotifications([
    {
      userId: workerUserId,
      sosRequestId,
      type: "RATING_RECEIVED",
      title: "근무 평가 등록",
      body: `'${sosTitle}' 근무에 대한 평가가 등록되었습니다.`,
    },
  ])

  return NextResponse.json({ success: true })
}
