// POST /api/admin/companies/:id/approve
import { getServerSession } from "@/lib/session"
import { prisma } from "@/lib/prisma"

export async function POST(
  _request: Request,
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

  const updated = await prisma.company.update({
    where: { id },
    data: {
      status: "APPROVED",
      isActive: true,
      licenseVerified: true,
    },
    select: { id: true, status: true, isActive: true },
  })

  return Response.json({ company: updated })
}
