import { prisma } from "@/lib/prisma"
import { getServerSession } from "@/lib/session"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Building2, FileCheck2, Zap, Users, ArrowRight } from "lucide-react"
import { StatCard } from "@/components/ui/stat-card"
import { DataTable } from "@/components/ui/data-table"
import { PageHeader } from "@/components/ui/page-header"
import { StatusBadge } from "@/components/ui/status-badge"
import { SOS_STATUS_LABELS, COMPANY_STATUS_LABELS } from "@/lib/constants"
import type { StatusVariant } from "@/components/ui/status-badge"

const SOS_STATUS_VARIANT: Record<string, StatusVariant> = {
  DISPATCHING: "active",
  PENDING:     "pending",
  CONFIRMED:   "confirmed",
  UNRESOLVED:  "unresolved",
  CANCELLED:   "inactive",
  COMPLETED:   "approved",
}

export default async function AdminDashboard() {
  const session = await getServerSession()
  if (!session || session.user.role !== "ADMIN") redirect("/login")

  const [
    pendingCompanies,
    pendingCredentials,
    activeSos,
    totalWorkers,
    recentSos,
    recentCompanies,
  ] = await Promise.all([
    prisma.company.count({ where: { status: "PENDING" } }),
    prisma.credential.count({ where: { status: "PENDING" } }),
    prisma.sosRequest.count({ where: { status: { in: ["DISPATCHING", "PENDING"] } } }),
    prisma.workerProfile.count({ where: { user: { deletedAt: null } } }),
    prisma.sosRequest.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { company: { select: { name: true } } },
    }),
    prisma.company.findMany({
      take: 3,
      orderBy: { createdAt: "desc" },
      where: { owner: { deletedAt: null } },
      select: { id: true, name: true, status: true, createdAt: true },
    }),
  ])

  type SosRow = {
    id: string
    date: string
    company: string
    status: React.ReactNode
  }

  const sosRows: SosRow[] = recentSos.map((s) => ({
    id: s.id,
    date: s.createdAt.toLocaleDateString("ko-KR"),
    company: s.company.name,
    status: (
      <StatusBadge
        variant={SOS_STATUS_VARIANT[s.status] ?? "pending"}
        label={SOS_STATUS_LABELS[s.status] ?? s.status}
      />
    ),
  }))

  return (
    <div className="space-y-8">
      <PageHeader title="관리자 대시보드" subtitle="플랫폼 현황을 한눈에 확인하세요." />

      {/* StatCard 2×2 그리드 */}
      <div className="grid grid-cols-2 gap-5 xl:grid-cols-4">
        <StatCard
          label="승인 대기 업체"
          value={pendingCompanies}
          icon={Building2}
          variant="default"
        />
        <StatCard
          label="검토 중 자격증"
          value={pendingCredentials}
          icon={FileCheck2}
          variant="default"
        />
        <StatCard
          label="진행 중 SOS"
          value={activeSos}
          icon={Zap}
          variant="sos"
        />
        <StatCard
          label="총 인력 수"
          value={totalWorkers}
          icon={Users}
          variant="brand"
        />
      </div>

      {/* 처리 필요 섹션 */}
      {(pendingCompanies > 0 || pendingCredentials > 0) && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">처리 필요</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {pendingCompanies > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-amber-800">승인 대기 업체</p>
                  <p className="text-2xl font-bold text-amber-900 mt-1">{pendingCompanies}개</p>
                </div>
                <Link
                  href="/members?tab=PENDING"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-600 text-white text-sm font-medium hover:bg-amber-700 transition-colors"
                >
                  심사하러 가기
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}
            {pendingCredentials > 0 && (
              <div className="bg-orange-50 border border-orange-200 rounded-2xl p-5 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-orange-800">검토 중 자격증</p>
                  <p className="text-2xl font-bold text-orange-900 mt-1">{pendingCredentials}건</p>
                </div>
                <Link
                  href="/credentials"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-orange-600 text-white text-sm font-medium hover:bg-orange-700 transition-colors"
                >
                  검토하러 가기
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 최근 활동 */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* 최근 SOS 5건 */}
        <div className="xl:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900">최근 SOS 요청</h2>
            <Link href="/sos-monitor" className="text-xs text-brand hover:underline">
              전체 보기
            </Link>
          </div>
          <DataTable<SosRow>
            columns={[
              { key: "date", label: "날짜" },
              { key: "company", label: "업체" },
              { key: "status", label: "상태", render: (row) => row.status },
            ]}
            data={sosRows}
            emptyMessage="최근 SOS 요청이 없습니다."
          />
        </div>

        {/* 최근 가입 업체 3건 */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900">최근 가입 업체</h2>
            <Link href="/members" className="text-xs text-brand hover:underline">
              전체 보기
            </Link>
          </div>
          {recentCompanies.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">등록된 업체가 없습니다.</p>
          ) : (
            <ul className="space-y-3">
              {recentCompanies.map((c) => (
                <li key={c.id} className="flex items-center justify-between">
                  <div>
                    <Link
                      href={`/members/${c.id}`}
                      className="text-sm font-medium text-gray-900 hover:text-brand transition-colors"
                    >
                      {c.name}
                    </Link>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {c.createdAt.toLocaleDateString("ko-KR")}
                    </p>
                  </div>
                  <StatusBadge
                    variant={
                      c.status === "APPROVED"
                        ? "approved"
                        : c.status === "REJECTED"
                        ? "rejected"
                        : "pending"
                    }
                    label={COMPANY_STATUS_LABELS[c.status] ?? c.status}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
