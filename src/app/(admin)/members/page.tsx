import { prisma } from "@/lib/prisma"
import { getServerSession } from "@/lib/session"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Building2 } from "lucide-react"
import { PageHeader } from "@/components/ui/page-header"
import { DataTable } from "@/components/ui/data-table"
import { EmptyState } from "@/components/ui/empty-state"
import { ADMIN_LABELS } from "@/lib/constants"
import { UserRole } from "@prisma/client"
import DangerZone from "./DangerZone"

export default async function AdminMembersPage() {
  const session = await getServerSession()
  if (!session || session.user.role !== "ADMIN") redirect("/login")

  const companies = await prisma.company.findMany({
    include: {
      owner: { select: { name: true, phone: true, deletedAt: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  // soft-delete된 owner의 업체 제외
  const filtered = companies.filter((c) => c.owner.deletedAt === null)

  const memberCount = await prisma.user.count({ where: { role: { not: UserRole.ADMIN } } })

  type CompanyRow = {
    id: string
    name: string
    licenseNumber: string
    city: string
    owner: string
    createdAt: string
    action: React.ReactNode
  }

  const rows: CompanyRow[] = filtered.map((c) => ({
    id: c.id,
    name: c.name,
    licenseNumber: c.licenseNumber,
    city: `${c.city} ${c.district}`,
    owner: c.owner.name ?? "-",
    createdAt: c.createdAt.toLocaleDateString("ko-KR"),
    action: (
      <Link
        href={`/members/${c.id}`}
        className="inline-flex items-center px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 hover:text-brand transition-colors"
      >
        상세보기
      </Link>
    ),
  }))

  return (
    <div className="space-y-6">
      <PageHeader
        title={ADMIN_LABELS.COMPANY_MANAGEMENT}
        subtitle="등록된 경비 업체 목록입니다."
        badge={{ label: `총 ${filtered.length}개`, variant: "default" }}
      />

      {/* 테이블 */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="등록된 업체가 없습니다"
            description="아직 등록된 경비 업체가 없습니다."
          />
        ) : (
          <DataTable<CompanyRow>
            columns={[
              { key: "name", label: "업체명" },
              { key: "licenseNumber", label: "허가번호" },
              { key: "city", label: "지역" },
              { key: "owner", label: "대표자" },
              { key: "createdAt", label: "등록일" },
              { key: "action", label: "액션", render: (row) => row.action },
            ]}
            data={rows}
            emptyMessage="등록된 업체가 없습니다."
          />
        )}
      </div>

      <DangerZone memberCount={memberCount} />
    </div>
  )
}
