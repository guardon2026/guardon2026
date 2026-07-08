import { redirect } from "next/navigation"
import { AlertTriangle } from "lucide-react"
import { ReportStatus } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "@/lib/session"
import { PageHeader } from "@/components/ui/page-header"
import { StatusBadge } from "@/components/ui/status-badge"
import { EmptyState } from "@/components/ui/empty-state"
import { AdminPatchButton } from "@/components/admin/AdminPatchButton"
import type { StatusVariant } from "@/components/ui/status-badge"

const STATUS_LABELS: Record<ReportStatus, string> = {
  OPEN: "접수",
  REVIEWING: "검토 중",
  RESOLVED: "해결",
  DISMISSED: "기각",
}

const STATUS_VARIANTS: Record<ReportStatus, StatusVariant> = {
  OPEN: "rejected",
  REVIEWING: "pending",
  RESOLVED: "approved",
  DISMISSED: "unresolved",
}

export default async function ReportsPage() {
  const session = await getServerSession()
  if (!session || session.user.role !== "ADMIN") redirect("/login")

  const reports = await prisma.report.findMany({
    include: {
      reporter: { select: { name: true, email: true, phone: true, role: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="신고 관리"
        subtitle="SOS 게시글, 신청, 업체, 경호 인력 신고를 검토하고 운영 처리합니다."
      />

      {reports.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <EmptyState
            icon={AlertTriangle}
            title="접수된 신고가 없습니다"
            description="신고가 접수되면 이곳에서 검토 상태를 관리할 수 있습니다."
          />
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-sm">
              <thead className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">상태</th>
                  <th className="px-4 py-3 text-left font-semibold">대상</th>
                  <th className="px-4 py-3 text-left font-semibold">사유</th>
                  <th className="px-4 py-3 text-left font-semibold">신고자</th>
                  <th className="px-4 py-3 text-left font-semibold">접수일</th>
                  <th className="px-4 py-3 text-left font-semibold">처리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {reports.map((report) => (
                  <tr key={report.id} className="hover:bg-gray-50/80 align-top">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <StatusBadge variant={STATUS_VARIANTS[report.status]} label={STATUS_LABELS[report.status]} />
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{report.targetType}</p>
                      <p className="text-xs text-gray-500">{report.targetId}</p>
                    </td>
                    <td className="px-4 py-3 max-w-sm">
                      <p className="font-medium text-gray-900">{report.reason}</p>
                      {report.description && <p className="text-xs text-gray-500 mt-1 whitespace-pre-line">{report.description}</p>}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-700">
                      <p>{report.reporter.name ?? report.reporter.email ?? report.reporter.phone ?? "사용자"}</p>
                      <p className="text-xs text-gray-500">{report.reporter.role ?? "-"}</p>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-500">
                      {report.createdAt.toLocaleString("ko-KR", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        <AdminPatchButton endpoint={`/api/admin/reports/${report.id}`} body={{ status: "REVIEWING" }} label="검토" />
                        <AdminPatchButton endpoint={`/api/admin/reports/${report.id}`} body={{ status: "RESOLVED" }} label="해결" />
                        <AdminPatchButton endpoint={`/api/admin/reports/${report.id}`} body={{ status: "DISMISSED" }} label="기각" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
