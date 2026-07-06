import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "@/lib/session"
import { UserRole } from "@prisma/client"
import { PageHeader } from "@/components/ui/page-header"
import PointChargeForm from "./PointChargeForm"

export default async function AdminPointsPage() {
  const session = await getServerSession()
  if (!session?.user?.id) redirect("/login")
  if (session.user.role !== UserRole.ADMIN) redirect("/")

  // 모든 유저(업체 대표 + 경비 인력)와 포인트 잔액 조회
  const users = await prisma.user.findMany({
    where: {
      role: { in: [UserRole.COMPANY_OWNER, UserRole.WORKER] },
      deletedAt: null,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      phone: true,
      pointAccount: { select: { balance: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  return (
    <div className="space-y-6 pb-10">
      <PageHeader title="포인트 관리" subtitle="유저에게 포인트를 충전합니다." />
      <PointChargeForm users={users} />
    </div>
  )
}
