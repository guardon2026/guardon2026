import { prisma } from "@/lib/prisma"
import { getServerSession } from "@/lib/session"
import { redirect } from "next/navigation"
import { PageHeader } from "@/components/ui/page-header"
import { DataTable } from "@/components/ui/data-table"
import { StatusBadge } from "@/components/ui/status-badge"
import { EmptyState } from "@/components/ui/empty-state"
import { Zap } from "lucide-react"
import { ADMIN_LABELS, SOS_STATUS_LABELS, WORK_FIELD_LABELS } from "@/lib/constants"
import type { StatusVariant } from "@/components/ui/status-badge"
import { AdminPatchButton } from "@/components/admin/AdminPatchButton"

const SOS_STATUS_VARIANT: Record<string, StatusVariant> = {
  DISPATCHING: "active",
  PENDING:     "pending",
  CONFIRMED:   "confirmed",
  UNRESOLVED:  "unresolved",
  CANCELLED:   "inactive",
  COMPLETED:   "approved",
}

export default async function SosMonitorPage() {
  const session = await getServerSession()
  if (!session || session.user.role !== "ADMIN") redirect("/login")

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  const [sosList, activeCount, completedCount, unresolvedCount] = await Promise.all([
    prisma.sosRequest.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      include: {
        company: { select: { name: true } },
        sosMatches: { select: { status: true } },
        _count: { select: { sosApplications: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.sosRequest.count({ where: { status: { in: ["DISPATCHING", "PENDING"] } } }),
    prisma.sosRequest.count({ where: { status: "COMPLETED" } }),
    prisma.sosRequest.count({ where: { status: "UNRESOLVED" } }),
  ])

  type SosRow = {
    id: string
    requestNo: string
    company: string
    location: string
    field: string
    requestedAt: string
    matchStatus: React.ReactNode
    status: React.ReactNode
    applications: string
    actions: React.ReactNode
    _rowClass: string
  }

  const rows: SosRow[] = sosList.map((sos, idx) => {
    const acceptedCount = sos.sosMatches.filter(
      (m) => m.status === "ACCEPTED" || m.status === "CONFIRMED"
    ).length
    const isFulfilled = acceptedCount >= sos.requiredCount

    let rowClass = ""
    if (sos.status === "CONFIRMED" || sos.status === "COMPLETED") rowClass = "bg-green-50/30"
    else if (sos.status === "UNRESOLVED") rowClass = "bg-red-50/30"

    return {
      id: sos.id,
      requestNo: `#${String(sosList.length - idx).padStart(4, "0")}`,
      company: sos.company.name,
      location: `${sos.city} ${sos.district}`,
      field: sos.requiredFields
        .map((f) => (WORK_FIELD_LABELS as Record<string, string>)[f] ?? f)
        .join(", ") || "-",
      requestedAt: sos.createdAt.toLocaleDateString("ko-KR", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
      matchStatus: (
        <span className={isFulfilled ? "text-green-600 font-medium text-sm" : "text-gray-500 text-sm"}>
          {acceptedCount}/{sos.requiredCount}명
        </span>
      ),
      status: (
        <StatusBadge
          variant={SOS_STATUS_VARIANT[sos.status] ?? "pending"}
          label={SOS_STATUS_LABELS[sos.status] ?? sos.status}
        />
      ),
      applications: `${sos._count.sosApplications}건`,
      actions: (
        <div className="flex flex-wrap gap-1.5">
          <AdminPatchButton endpoint={`/api/admin/sos/${sos.id}`} body={{ status: "UNRESOLVED", reason: "관리자 미해결 처리" }} label="미해결" />
          <AdminPatchButton endpoint={`/api/admin/sos/${sos.id}`} body={{ status: "CANCELLED", reason: "관리자 숨김 처리" }} label="숨김" variant="danger" />
        </div>
      ),
      _rowClass: rowClass,
    }
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="SOS 모니터"
        subtitle="최근 30일 SOS 요청 현황을 실시간으로 확인합니다."
      />

      {/* 상태 요약 카드 3개 */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-center">
          <p className="text-2xl font-bold text-amber-900">{activeCount}</p>
          <p className="text-sm text-amber-700 mt-1">진행 중</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-center">
          <p className="text-2xl font-bold text-green-900">{completedCount}</p>
          <p className="text-sm text-green-700 mt-1">완료</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-center">
          <p className="text-2xl font-bold text-red-900">{unresolvedCount}</p>
          <p className="text-sm text-red-700 mt-1">미해결</p>
        </div>
      </div>

      {/* DataTable */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {rows.length === 0 ? (
          <EmptyState
            icon={Zap}
            title={ADMIN_LABELS.SOS_MONITOR_EMPTY}
            description="최근 30일 동안 접수된 SOS 요청이 없습니다."
          />
        ) : (
          <DataTable<SosRow>
            columns={[
              { key: "requestNo", label: "요청 번호" },
              { key: "company", label: "업체명" },
              { key: "location", label: "장소" },
              { key: "field", label: "분야" },
              { key: "requestedAt", label: "요청 시각" },
              { key: "matchStatus", label: "매칭 현황", render: (row) => row.matchStatus },
              { key: "applications", label: "신청" },
              { key: "status", label: "상태", render: (row) => row.status },
              { key: "actions", label: "운영 처리", render: (row) => row.actions },
            ]}
            data={rows}
            emptyMessage={ADMIN_LABELS.SOS_MONITOR_EMPTY}
            rowClassName={(row) => row._rowClass}
          />
        )}
      </div>
    </div>
  )
}
