export const dynamic = 'force-dynamic'
// GET /api/admin/companies?status=PENDING
import { getServerSession } from "@/lib/session"
import { prisma } from "@/lib/prisma"

export async function GET(request: Request) {
  const session = await getServerSession()
  if (!session?.user?.id) {
    return Response.json({ error: "?�증???�요?�니??" }, { status: 401 })
  }
  if (session.user.role !== "ADMIN") {
    return Response.json({ error: "관리자 권한???�요?�니??" }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const statusParam = searchParams.get("status") ?? "PENDING"

  // ?�효??status 값만 ?�용 (injection 방어)
  const validStatuses = ["PENDING", "APPROVED", "REJECTED"] as const
  type ValidStatus = (typeof validStatuses)[number]
  const status = (validStatuses as readonly string[]).includes(statusParam)
    ? (statusParam as ValidStatus)
    : "PENDING"

  const companies = await prisma.company.findMany({
    where: { status },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      licenseNumber: true,
      city: true,
      district: true,
      phone: true,
      status: true,
      createdAt: true,
      owner: {
        select: {
          name: true,
          email: true,
          phone: true,
          deletedAt: true, // soft-delete ?�터??        },
      },
    },
  })

  // soft-delete??owner???�체???�외
  const filtered = companies.filter((c) => c.owner.deletedAt === null)

  return Response.json({ companies: filtered })
}
