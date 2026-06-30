import { prisma } from "@/lib/prisma"
import { getServerSession } from "@/lib/session"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Building2 } from "lucide-react"
import { PageHeader } from "@/components/ui/page-header"
import { DataTable } from "@/components/ui/data-table"
import { StatusBadge } from "@/components/ui/status-badge"
import { EmptyState } from "@/components/ui/empty-state"
import { ADMIN_LABELS, COMPANY_STATUS_LABELS } from "@/lib/constants"
import type { StatusVariant } from "@/components/ui/status-badge"

type TabKey = "ALL" | "PENDING" | "APPROVED" | "REJECTED"

interface SearchParams {
  tab?: string
}

const TAB_VARIANT: Record<string, StatusVariant> = {
  PENDING:  "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
}

export default async function AdminMembersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const session = await getServerSession()
  if (!session || session.user.role !== "ADMIN") redirect("/login")

  const { tab } = await searchParams
  const currentTab: TabKey =
    tab === "PENDING" || tab === "APPROVED" || tab === "REJECTED" ? tab : "ALL"

  const whereClause =
    currentTab === "ALL" ? {} : { status: currentTab as "PENDING" | "APPROVED" | "REJECTED" }

  const [companies, pendingCount] = await Promise.all([
    prisma.company.findMany({
      where: whereClause,
      include: {
        owner: { select: { name: true, phone: true, deletedAt: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.company.count({ where: { status: "PENDING" } }),
  ])

  // soft-delete된 owner의 업체 제외
  const filtered = companies.filter((c) => c.owner.deletedAt === null)

  const tabs: { key: TabKey; label: string }[] = [
    { key: "ALL", label: ADMIN_LABELS.TAB_ALL },
    { key: "PENDING", label: ADMIN_LABELS.TAB_PENDING },
    { key: "APPROVED", label: ADMIN_LABELS.TAB_APPROVED },
    { key: "REJECTED", label: ADMIN_LABELS.TAB_REJECTED },
  ]

  type CompanyRow = {
    id: string
    name: string
    licenseNumber: string
    city: string
    createdAt: string
    status: React.ReactNode
    action: React.ReactNode
    _isPending: boolean
  }

  const rows: CompanyRow[] = filtered.map((c) => ({
    id: c.id,
    name: c.name,
    licenseNumber: c.licenseNumber,
    city: `${c.city} ${c.district}`,
    createdAt: c.createdAt.toLocaleDateString("ko-KR"),
    status: (
      <StatusBadge
        variant={TAB_VARIANT[c.status] ?? "pending"}
        label={COMPANY_STATUS_LABELS[c.status] ?? c.status}
      />
    ),
    action: (
      <Link
        href={`/members/${c.id}`}
        className="inline-flex items-center px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 hover:text-brand transition-colors"
      >
        상세보기
      </Link>
    ),
    _isPending: c.status === "PENDING",
  }))

  return (
    <div className="space-y-6">
      <PageHeader
        title={ADMIN_LABELS.COMPANY_MANAGEMENT}
        subtitle="등록된 경비업체를 심사하고 관리합니다."
        badge={pendingCount > 0 ? { label: `${pendingCount}건 대기`, variant: "warning" } : undefined}
      />

      {/* 탭 필터 */}
      <div className="flex gap-2">
        {tabs.map(({ key, label }) => (
          <Link
            key={key}
            href={`/members?tab=${key}`}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
              currentTab === key
                ? "bg-brand text-white"
                : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200"
            }`}
          >
            {label}
            {key === "PENDING" && pendingCount > 0 && (
              <span
                className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold ${
                  currentTab === key ? "bg-white/20 text-white" : "bg-sos text-white"
                }`}
              >
                {pendingCount}
              </span>
            )}
          </Link>
        ))}
      </div>

      {/* 테이블 */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState
            icon={Building2}
            title={ADMIN_LABELS.PENDING_COMPANIES_EMPTY}
            description="조건에 맞는 업체가 없습니다."
          />
        ) : (
          <DataTable<CompanyRow>
            columns={[
              { key: "name", label: "업체명" },
              { key: "licenseNumber", label: "허가번호" },
              { key: "city", label: "지역" },
              { key: "createdAt", label: "신청일" },
              { key: "status", label: "상태", render: (row) => row.status },
              { key: "action", label: "액션", render: (row) => row.action },
            ]}
            data={rows}
            emptyMessage={ADMIN_LABELS.PENDING_COMPANIES_EMPTY}
            rowClassName={(row) => row._isPending ? "bg-amber-50/30" : ""}
          />
        )}
      </div>
    </div>
  )
}
