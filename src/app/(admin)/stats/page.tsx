import { prisma } from "@/lib/prisma"
import { getServerSession } from "@/lib/session"
import { redirect } from "next/navigation"
import { Building2, Users, Zap, TrendingUp } from "lucide-react"
import { PageHeader } from "@/components/ui/page-header"
import { StatCard } from "@/components/ui/stat-card"
import { DataTable } from "@/components/ui/data-table"
import { ADMIN_LABELS } from "@/lib/constants"

export default async function StatsPage() {
  const session = await getServerSession()
  if (!session || session.user.role !== "ADMIN") redirect("/login")

  const now = new Date()
  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() - now.getDay())
  startOfWeek.setHours(0, 0, 0, 0)

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const [
    totalCompanies,
    totalWorkers,
    completedSosThisMonth,
    totalSos,
    completedSos,
    unresolvedSos,
    // 이번 주
    newCompaniesWeek,
    newWorkersWeek,
    sosWeek,
    completedSosWeek,
    unresolvedSosWeek,
    // 이번 달
    newCompaniesMonth,
    newWorkersMonth,
    sosMonth,
    completedSosMonth,
    unresolvedSosMonth,
  ] = await Promise.all([
    prisma.company.count(),
    prisma.workerProfile.count({ where: { user: { deletedAt: null } } }),
    prisma.sosRequest.count({
      where: { status: "COMPLETED", updatedAt: { gte: startOfMonth } },
    }),
    prisma.sosRequest.count(),
    prisma.sosRequest.count({ where: { status: "COMPLETED" } }),
    prisma.sosRequest.count({ where: { status: "UNRESOLVED" } }),
    // 이번 주
    prisma.company.count({ where: { createdAt: { gte: startOfWeek } } }),
    prisma.workerProfile.count({ where: { createdAt: { gte: startOfWeek }, user: { deletedAt: null } } }),
    prisma.sosRequest.count({ where: { createdAt: { gte: startOfWeek } } }),
    prisma.sosRequest.count({ where: { status: "COMPLETED", updatedAt: { gte: startOfWeek } } }),
    prisma.sosRequest.count({ where: { status: "UNRESOLVED", updatedAt: { gte: startOfWeek } } }),
    // 이번 달
    prisma.company.count({ where: { createdAt: { gte: startOfMonth } } }),
    prisma.workerProfile.count({ where: { createdAt: { gte: startOfMonth }, user: { deletedAt: null } } }),
    prisma.sosRequest.count({ where: { createdAt: { gte: startOfMonth } } }),
    prisma.sosRequest.count({ where: { status: "COMPLETED", updatedAt: { gte: startOfMonth } } }),
    prisma.sosRequest.count({ where: { status: "UNRESOLVED", updatedAt: { gte: startOfMonth } } }),
  ])

  const resolutionRate =
    totalSos > 0 ? Math.round((completedSos / totalSos) * 100) : 0

  // 최근 7일 SOS 날짜별 데이터
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const recentSosList = await prisma.sosRequest.findMany({
    where: { createdAt: { gte: sevenDaysAgo } },
    select: { createdAt: true },
  })

  // 날짜별 집계
  const dayMap: Record<string, number> = {}
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(now.getDate() - i)
    const key = d.toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" })
    dayMap[key] = 0
  }
  for (const s of recentSosList) {
    const key = s.createdAt.toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" })
    if (key in dayMap) dayMap[key]++
  }

  const chartData = Object.entries(dayMap).map(([label, count]) => ({ label, count }))
  const maxCount = Math.max(...chartData.map((d) => d.count), 1)

  // 기간 요약 테이블 데이터
  type SummaryRow = {
    category: string
    thisWeek: string
    thisMonth: string
    total: string
  }

  const summaryRows: SummaryRow[] = [
    {
      category: "신규 업체",
      thisWeek: `${newCompaniesWeek}개`,
      thisMonth: `${newCompaniesMonth}개`,
      total: `${totalCompanies}개`,
    },
    {
      category: "신규 인력",
      thisWeek: `${newWorkersWeek}명`,
      thisMonth: `${newWorkersMonth}명`,
      total: `${totalWorkers}명`,
    },
    {
      category: "SOS 요청",
      thisWeek: `${sosWeek}건`,
      thisMonth: `${sosMonth}건`,
      total: `${totalSos}건`,
    },
    {
      category: "SOS 완료",
      thisWeek: `${completedSosWeek}건`,
      thisMonth: `${completedSosMonth}건`,
      total: `${completedSos}건`,
    },
    {
      category: "SOS 미해결",
      thisWeek: `${unresolvedSosWeek}건`,
      thisMonth: `${unresolvedSosMonth}건`,
      total: `${unresolvedSos}건`,
    },
  ]

  return (
    <div className="space-y-8">
      <PageHeader
        title={ADMIN_LABELS.STATS_PAGE_TITLE}
        subtitle="플랫폼 전체 운영 지표를 확인합니다."
      />

      {/* 상단 4개 StatCard */}
      <div className="grid grid-cols-2 gap-5 xl:grid-cols-4">
        <StatCard
          label="전체 업체 수"
          value={totalCompanies}
          icon={Building2}
          variant="brand"
        />
        <StatCard
          label="전체 인력 수"
          value={totalWorkers}
          icon={Users}
          variant="brand"
        />
        <StatCard
          label="이번 달 SOS 완료"
          value={completedSosThisMonth}
          icon={Zap}
          variant="sos"
        />
        <StatCard
          label="SOS 해결률"
          value={`${resolutionRate}%`}
          icon={TrendingUp}
          variant="default"
        />
      </div>

      {/* 기간 요약 테이블 */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">기간별 요약</h2>
        <DataTable<SummaryRow>
          columns={[
            { key: "category", label: "구분" },
            { key: "thisWeek", label: "이번 주" },
            { key: "thisMonth", label: "이번 달" },
            { key: "total", label: "누적" },
          ]}
          data={summaryRows}
        />
      </div>

      {/* 최근 7일 SOS 현황 — CSS 바 차트 */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-6">최근 7일 SOS 현황</h2>
        <div className="flex items-end gap-2 h-32">
          {chartData.map((d) => (
            <div key={d.label} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-xs font-medium text-gray-700">{d.count > 0 ? d.count : ""}</span>
              <div
                className="w-full bg-brand rounded-t-sm min-h-[2px]"
                style={{ height: `${(d.count / maxCount) * 100}%` }}
              />
              <span className="text-xs text-gray-400 whitespace-nowrap">{d.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
