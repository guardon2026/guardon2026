export const dynamic = 'force-dynamic'
// POST /api/admin/companies/:id/reject
import { getServerSession } from "@/lib/session"
import { prisma } from "@/lib/prisma"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession()
  if (!session?.user?.id) {
    return Response.json({ error: "인증이 필요합니다." }, { status: 401 })
  }
  if (session.user.role !== "ADMIN") {
    return Response.json({ error: "관리자 권한이 필요합니다." }, { status: 403 })
  }

  const { id } = await params

  const company = await prisma.company.findUnique({
    where: { id },
  })
  if (!company) {
    return Response.json({ error: "업체를 찾을 수 없습니다." }, { status: 404 })
  }

  let rejectionReason = ""
  try {
    const body = await request.json()
    rejectionReason = String(body.rejectionReason ?? "").trim()
  } catch {
    // body 없이 호출된 이전 UI도 서버 오류 대신 검증 메시지를 반환한다.
  }

  if (!rejectionReason) {
    return Response.json(
      { error: "반려 사유를 입력해 주세요." },
      { status: 400 }
    )
  }

  const updated = await prisma.company.update({
    where: { id },
    data: {
      status: "REJECTED",
      isActive: false,
      licenseVerified: false,
      approvedAt: null,
      rejectedAt: new Date(),
      rejectionReason,
      reviewedAt: new Date(),
    },
    select: { id: true, status: true, isActive: true, rejectedAt: true, rejectionReason: true },
  })

  return Response.json({ company: updated })
}
