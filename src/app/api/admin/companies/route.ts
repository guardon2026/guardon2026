export const dynamic = 'force-dynamic'
// GET /api/admin/companies?status=PENDING
import { getServerSession } from "@/lib/session"
import { prisma } from "@/lib/prisma"

export async function GET(request: Request) {
  const session = await getServerSession()
  if (!session?.user?.id) {
    return Response.json({ error: "?¸ì¦???„ìš”?©ë‹ˆ??" }, { status: 401 })
  }
  if (session.user.role !== "ADMIN") {
    return Response.json({ error: "ê´€ë¦¬ìž ê¶Œí•œ???„ìš”?©ë‹ˆ??" }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const statusParam = searchParams.get("status") ?? "PENDING"

  // ? íš¨??status ê°’ë§Œ ?ˆìš© (injection ë°©ì–´)
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
          deletedAt: true, // soft-delete ?„í„°??        },
      },
    },
  })

  // soft-delete??owner???…ì²´???œì™¸
  const filtered = companies.filter((c) => c.owner.deletedAt === null)

  return Response.json({ companies: filtered })
}
