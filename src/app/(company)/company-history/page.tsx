import { redirect } from "next/navigation"
import Link from "next/link"
import { FileText } from "lucide-react"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "@/lib/session"
import { UserRole, SosMatchStatus } from "@prisma/client"
import { PageHeader } from "@/components/ui/page-header"
import { StatusBadge } from "@/components/ui/status-badge"
import { EmptyState } from "@/components/ui/empty-state"
import { DataTable } from "@/components/ui/data-table"
import {
  HISTORY_LABELS,
  SOS_STATUS_LABELS,
  WORK_FIELD_LABELS,
} from "@/lib/constants"
import type { StatusVariant } from "@/components/ui/status-badge"

function sosStatusVariant(status: string): StatusVariant {
  switch (status) {
    case "DISPATCHING": return "active"
    case "PENDING":     return "pending"
    case "CONFIRMED":   return "confirmed"
    case "UNRESOLVED":  return "unresolved"
    case "CANCELLED":   return "rejected"
    case "COMPLETED":   return "approved"
    default:            return "unresolved"
  }
}

type HistoryRow = {
  id: string
  date: string
  location: string
  fields: string
  matchResult: string
  status: string
  link: string
}

export default async function CompanyHistoryPage() {
  const session = await getServerSession()
  if (!session?.user?.id) redirect("/login")
  if (session.user.role !== UserRole.COMPANY_OWNER) redirect("/")

  const company = await prisma.company.findUnique({
    where: { ownerId: session.user.id },
    select: { id: true },
  })
  if (!company) redirect("/register")

  const sosRequests = await prisma.sosRequest.findMany({
    where: { companyId: company.id },
    include: {
      sosMatches: {
        where: { status: SosMatchStatus.CONFIRMED },
        select: { id: true },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  const rows: HistoryRow[] = sosRequests.map((req) => ({
    id: req.id,
    date: new Date(req.scheduledAt).toLocaleString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }),
    location: req.locationAddress,
    fields: req.requiredFields
      .map((f) => WORK_FIELD_LABELS[f] ?? f)
      .join(", ") || "—",
    matchResult: `${req.sosMatches.length}명 확정 / ${req.requiredCount}명 필요`,
    status: req.status,
    link: `/sos/${req.id}`,
  }))

  const columns = [
    {
      key: "date" as const,
      label: "날짜",
      width: "160px",
    },
    {
      key: "location" as const,
      label: "장소",
      render: (row: HistoryRow) => (
        <span className="text-sm text-gray-700 truncate max-w-[180px] block">{row.location}</span>
      ),
    },
    {
      key: "fields" as const,
      label: "분야",
      width: "140px",
    },
    {
      key: "matchResult" as const,
      label: "매칭 결과",
      width: "160px",
      render: (row: HistoryRow) => (
        <span className="text-sm font-medium text-brand">{row.matchResult}</span>
      ),
    },
    {
      key: "status" as const,
      label: "상태",
      width: "100px",
      render: (row: HistoryRow) => (
        <StatusBadge
          variant={sosStatusVariant(row.status)}
          label={SOS_STATUS_LABELS[row.status] ?? row.status}
        />
      ),
    },
    {
      key: "link" as const,
      label: "상세보기",
      width: "80px",
      render: (row: HistoryRow) => (
        <Link
          href={row.link}
          className="text-sm font-medium text-brand hover:text-blue-700 transition-colors"
        >
          보기 →
        </Link>
      ),
    },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        <PageHeader
          title={HISTORY_LABELS.COMPANY.PAGE_TITLE}
          subtitle={HISTORY_LABELS.COMPANY.PAGE_SUBTITLE}
        />

        {sosRequests.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-card border border-gray-100">
            <EmptyState
              icon={FileText}
              title={HISTORY_LABELS.COMPANY.EMPTY}
              description="SOS 요청을 발송하면 여기에 이력이 기록됩니다."
              action={{ label: "새 SOS 요청", href: "/sos/new" }}
            />
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-card border border-gray-100 overflow-hidden">
            <DataTable
              columns={columns}
              data={rows}
              emptyMessage={HISTORY_LABELS.COMPANY.EMPTY}
            />
          </div>
        )}
      </div>
    </div>
  )
}
