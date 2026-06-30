import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "@/lib/session"
import { UserRole, SosMatchStatus } from "@prisma/client"
import { CheckCircle, Briefcase, DollarSign } from "lucide-react"
import { PageHeader } from "@/components/ui/page-header"
import { StatCard } from "@/components/ui/stat-card"
import { DataTable, type Column } from "@/components/ui/data-table"
import { EmptyState } from "@/components/ui/empty-state"
import { StatusBadge } from "@/components/ui/status-badge"
import {
  HISTORY_LABELS,
  SOS_STATUS_LABELS,
  WORK_FIELD_LABELS,
} from "@/lib/constants"

// ─────────────────────────────────────────
// 타입
// ─────────────────────────────────────────

interface HistoryRow extends Record<string, unknown> {
  id: string
  date: string
  company: string
  location: string
  field: string
  hourlyRate: string
  status: string
  statusRaw: string
}

// ─────────────────────────────────────────
// 상태 배지
// ─────────────────────────────────────────

function StatusCell({ status }: { status: string }) {
  const variant =
    status === "CONFIRMED" || status === "COMPLETED"
      ? "approved"
      : status === "CANCELLED" || status === "UNRESOLVED"
      ? "rejected"
      : "pending"
  return (
    <StatusBadge
      variant={variant as "approved" | "rejected" | "pending"}
      label={SOS_STATUS_LABELS[status] ?? status}
    />
  )
}

// ─────────────────────────────────────────
// 페이지 (Server Component)
// ─────────────────────────────────────────

export default async function WorkerHistoryPage() {
  const session = await getServerSession()
  if (!session?.user?.id) redirect("/login")
  if (session.user.role !== UserRole.WORKER) redirect("/")

  const workerProfile = await prisma.workerProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  })

  if (!workerProfile) redirect("/profile/edit")

  const matches = await prisma.sosMatch.findMany({
    where: {
      workerProfileId: workerProfile.id,
      status: SosMatchStatus.CONFIRMED,
    },
    include: {
      sosRequest: {
        include: {
          company: { select: { name: true } },
        },
      },
    },
    orderBy: { confirmedAt: "desc" },
  })

  // 요약 통계
  const totalDispatches = matches.length
  const completedDispatches = matches.filter(
    (m) => m.sosRequest.status === "COMPLETED" || m.sosRequest.status === "CONFIRMED",
  ).length
  const avgHourlyRate =
    matches.length > 0
      ? Math.round(
          matches.reduce((sum, m) => sum + m.sosRequest.hourlyRate, 0) / matches.length,
        )
      : 0

  // DataTable 행 변환
  const rows: HistoryRow[] = matches.map((match) => {
    const req = match.sosRequest
    const fields = req.requiredFields
      .map((f) => WORK_FIELD_LABELS[f] ?? f)
      .join(", ")
    return {
      id: match.id,
      date: new Date(req.scheduledAt).toLocaleDateString("ko-KR", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      company: req.company.name,
      location: req.locationAddress,
      field: fields || "-",
      hourlyRate: `${req.hourlyRate.toLocaleString()}원`,
      status: req.status,
      statusRaw: req.status,
    }
  })

  const columns: Column<HistoryRow>[] = [
    { key: "date",       label: "배치 날짜",  width: "140px" },
    { key: "company",    label: "업체명",     width: "140px" },
    { key: "location",   label: "집결지" },
    { key: "field",      label: "업무 분야",  width: "120px" },
    { key: "hourlyRate", label: "시급",       width: "100px" },
    {
      key: "status",
      label: "상태",
      width: "100px",
      render: (row) => <StatusCell status={row.statusRaw} />,
    },
  ]

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        title="파견 이력"
        subtitle={HISTORY_LABELS.WORKER.PAGE_SUBTITLE}
      />

      {/* 요약 통계 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="총 파견"
          value={totalDispatches}
          icon={Briefcase}
          variant="brand"
        />
        <StatCard
          label="완료"
          value={completedDispatches}
          icon={CheckCircle}
          variant="brand"
        />
        <StatCard
          label="평균 시급"
          value={avgHourlyRate > 0 ? `${avgHourlyRate.toLocaleString()}원` : "-"}
          icon={DollarSign}
          variant="default"
        />
      </div>

      {/* 이력 테이블 */}
      {matches.length === 0 ? (
        <EmptyState
          icon={CheckCircle}
          title="아직 파견 이력이 없습니다"
          description="확정된 배치 요청이 완료되면 여기에 표시됩니다."
        />
      ) : (
        <DataTable<HistoryRow>
          columns={columns}
          data={rows}
          emptyMessage={HISTORY_LABELS.WORKER.EMPTY}
        />
      )}
    </div>
  )
}
