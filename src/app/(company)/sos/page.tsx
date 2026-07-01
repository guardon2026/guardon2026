import { redirect } from "next/navigation"
import Link from "next/link"
import { Zap, Plus, MapPin, Calendar, Users } from "lucide-react"
import { getServerSession } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { PageHeader } from "@/components/ui/page-header"
import { StatusBadge } from "@/components/ui/status-badge"
import { EmptyState } from "@/components/ui/empty-state"
import { SOS_STATUS_LABELS } from "@/lib/constants"
import type { StatusVariant } from "@/components/ui/status-badge"
import { UserRole, SosMatchStatus } from "@prisma/client"

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

type TabKey = "전체" | "진행 중" | "확정" | "미해결"

const TAB_FILTERS: Record<TabKey, string[]> = {
  "전체":   ["DISPATCHING", "PENDING", "CONFIRMED", "UNRESOLVED", "CANCELLED", "COMPLETED"],
  "진행 중": ["DISPATCHING", "PENDING"],
  "확정":   ["CONFIRMED", "COMPLETED"],
  "미해결": ["UNRESOLVED"],
}

export default async function SosPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const session = await getServerSession()
  if (!session?.user?.id) redirect("/login")
  if (session.user.role !== UserRole.COMPANY_OWNER) redirect("/")

  const company = await prisma.company.findUnique({
    where: { ownerId: session.user.id },
    select: { id: true, status: true },
  })
  if (!company) redirect("/register")
  if (company.status !== "APPROVED") redirect("/pending")

  const { tab = "전체" } = await searchParams
  const activeTab = (TAB_FILTERS[tab as TabKey] ? tab : "전체") as TabKey
  const statusFilter = TAB_FILTERS[activeTab]

  const sosRequests = await prisma.sosRequest.findMany({
    where: {
      companyId: company.id,
      status: { in: statusFilter as never[] },
    },
    include: {
      sosMatches: {
        select: { id: true, status: true },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  const TABS: TabKey[] = ["전체", "진행 중", "확정", "미해결"]

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <PageHeader
          title="SOS 요청 현황"
          subtitle="발송한 긴급 인력 요청 목록입니다."
          action={
            <Link
              href="/sos/new"
              className="inline-flex items-center gap-1.5 h-9 px-4
                         bg-sos text-white text-sm font-semibold rounded-xl
                         hover:bg-red-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              새 SOS 요청
            </Link>
          }
        />

        {/* 탭 필터 */}
        <div className="flex gap-1 bg-white rounded-xl border border-gray-100 p-1 shadow-sm">
          {TABS.map((t) => (
            <Link
              key={t}
              href={`/sos?tab=${t}`}
              className={`flex-1 text-center py-2 text-sm font-medium rounded-lg transition-colors
                ${activeTab === t
                  ? "bg-gray-900 text-white"
                  : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
                }`}
            >
              {t}
            </Link>
          ))}
        </div>

        {/* 목록 */}
        {sosRequests.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-card">
            <EmptyState
              icon={Zap}
              title="첫 SOS 요청을 발송해보세요"
              description="긴급 인력이 필요할 때 즉시 요청을 발송하고 8분 안에 매칭 받으세요."
              action={{ label: "새 SOS 요청", href: "/sos/new" }}
            />
          </div>
        ) : (
          <div className="space-y-3">
            {sosRequests.map((req) => {
              const acceptedCount = req.sosMatches.filter(
                (m) => m.status === SosMatchStatus.ACCEPTED
              ).length
              const confirmedCount = req.sosMatches.filter(
                (m) => m.status === SosMatchStatus.CONFIRMED
              ).length

              return (
                <Link
                  key={req.id}
                  href={`/sos/${req.id}`}
                  className="block bg-white rounded-2xl border border-gray-100 shadow-card p-5
                             hover:border-brand/30 hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center gap-2">
                        <StatusBadge
                          variant={sosStatusVariant(req.status)}
                          label={SOS_STATUS_LABELS[req.status] ?? req.status}
                        />
                      </div>
                      <p className="text-base font-semibold text-gray-900 truncate">
                        {req.title}
                      </p>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(req.scheduledAt).toLocaleString("ko-KR", {
                            month: "long",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" />
                          {req.locationAddress}
                        </span>
                      </div>
                    </div>

                    {/* 매칭 현황 */}
                    <div className="shrink-0 text-right space-y-1">
                      <div className="flex items-center gap-1.5 justify-end">
                        <Users className="w-3.5 h-3.5 text-gray-400" />
                        <span className="text-xs text-gray-500">
                          {confirmedCount}명 확정 / {req.requiredCount}명 필요
                        </span>
                      </div>
                      {acceptedCount > 0 && (
                        <p className="text-xs text-brand font-medium">
                          {acceptedCount}명 수락 대기
                        </p>
                      )}
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
