import { redirect } from "next/navigation"
import Link from "next/link"
import { AlertTriangle, Calendar, Plus, Search, Users, Zap } from "lucide-react"
import { Prisma, SosUrgency, UserRole } from "@prisma/client"
import { getServerSession } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { PageHeader } from "@/components/ui/page-header"
import { StatusBadge } from "@/components/ui/status-badge"
import { EmptyState } from "@/components/ui/empty-state"
import { SOS_STATUS_LABELS, WORK_FIELD_LABELS } from "@/lib/constants"
import type { StatusVariant } from "@/components/ui/status-badge"

const URGENCY_LABELS: Record<SosUrgency, string> = {
  CRITICAL: "즉시",
  URGENT: "긴급",
  FAST: "빠름",
  NORMAL: "일반",
}

const URGENCY_VARIANTS: Record<SosUrgency, StatusVariant> = {
  CRITICAL: "sos",
  URGENT: "rejected",
  FAST: "pending",
  NORMAL: "unresolved",
}

const SORT_OPTIONS = new Set(["newest", "urgent", "deadline", "budget", "fewest"])

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

function formatDateTime(date: Date) {
  return new Date(date).toLocaleString("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function makeOrderBy(sort: string): Prisma.SosRequestOrderByWithRelationInput[] {
  switch (sort) {
    case "urgent":
      return [{ urgencyLevel: "desc" }, { createdAt: "desc" }]
    case "deadline":
      return [{ applicationDeadline: "asc" }, { scheduledAt: "asc" }]
    case "budget":
      return [{ budgetTotal: "desc" }, { hourlyRate: "desc" }]
    case "fewest":
      return [{ applicationCount: "asc" }, { createdAt: "desc" }]
    default:
      return [{ createdAt: "desc" }]
  }
}

export default async function SosPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string
    region?: string
    urgency?: string
    service?: string
    sort?: string
    scope?: string
    openOnly?: string
  }>
}) {
  const session = await getServerSession()
  if (!session?.user?.id || !session.user.role) redirect("/login")
  if (session.user.role !== UserRole.COMPANY_OWNER && session.user.role !== UserRole.WORKER) redirect("/")

  const params = await searchParams
  const q = params.q?.trim() ?? ""
  const region = params.region?.trim() ?? ""
  const service = params.service?.trim() ?? ""
  const sort = SORT_OPTIONS.has(params.sort ?? "") ? params.sort! : "newest"
  const scope = params.scope === "mine" ? "mine" : "board"
  const openOnly = params.openOnly !== "false"
  const urgency = Object.values(SosUrgency).includes(params.urgency as SosUrgency)
    ? (params.urgency as SosUrgency)
    : null

  let company: { id: string; status: string; isActive: boolean } | null = null
  let workerProfile: { id: string } | null = null

  if (session.user.role === UserRole.COMPANY_OWNER) {
    company = await prisma.company.findUnique({
      where: { ownerId: session.user.id },
      select: { id: true, status: true, isActive: true },
    })
    if (!company) redirect("/register")
    if (company.status !== "APPROVED" || !company.isActive) redirect("/pending")
  } else {
    const profile = await prisma.workerProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true, address: true, city: true, district: true, workFields: true },
    })
    if (!profile || !profile.address || !profile.city || !profile.district || profile.workFields.length === 0) {
      redirect("/profile/edit")
    }
    workerProfile = { id: profile.id }
  }

  const where: Prisma.SosRequestWhereInput = {
    status: { notIn: ["CANCELLED", "COMPLETED"] },
  }
  if (openOnly) {
    where.closedAt = null
    where.OR = [
      { applicationDeadline: null },
      { applicationDeadline: { gt: new Date() } },
    ]
  }
  if (scope === "mine") {
    if (session.user.role === UserRole.COMPANY_OWNER && company) {
      where.companyId = company.id
    } else {
      where.sosApplications = { some: { applicantUserId: session.user.id } }
    }
  }
  if (q) {
    where.AND = [
      ...(Array.isArray(where.AND) ? where.AND : []),
      {
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
          { company: { name: { contains: q, mode: "insensitive" } } },
        ],
      },
    ]
  }
  if (region) {
    where.AND = [
      ...(Array.isArray(where.AND) ? where.AND : []),
      {
        OR: [
          { region: { contains: region, mode: "insensitive" } },
          { city: { contains: region, mode: "insensitive" } },
          { district: { contains: region, mode: "insensitive" } },
        ],
      },
    ]
  }
  if (service) where.serviceType = { contains: service, mode: "insensitive" }
  if (urgency) where.urgencyLevel = urgency

  const sosRequests = await prisma.sosRequest.findMany({
    where,
    include: {
      company: { select: { id: true, name: true } },
      sosApplications: {
        where: { applicantUserId: session.user.id },
        select: { id: true, status: true },
      },
      _count: { select: { sosApplications: true, sosMatches: true } },
    },
    orderBy: makeOrderBy(sort),
    take: 80,
  })

  const canCreate = session.user.role === UserRole.COMPANY_OWNER && company?.status === "APPROVED"
  const boardHref = "/sos"
  const mineHref = "/sos?scope=mine"

  return (
    <div className="space-y-6">
      <PageHeader
        title="GuardOn SOS 게시판"
        subtitle="검증된 경호 업체와 경호 인력이 긴급 요청을 확인하고 신청합니다."
        action={
          canCreate ? (
            <Link
              href="/sos/new"
              className="inline-flex items-center gap-1.5 h-9 px-4 bg-sos text-white text-sm font-semibold rounded-xl hover:bg-red-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              새 SOS 등록
            </Link>
          ) : undefined
        }
      />

      <form className="bg-white border border-gray-100 rounded-xl shadow-sm p-4 grid grid-cols-1 md:grid-cols-[1.3fr_0.8fr_0.8fr_0.8fr_0.7fr_auto] gap-3">
        <label className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            name="q"
            defaultValue={q}
            placeholder="제목, 설명, 업체명 검색"
            className="w-full h-10 pl-9 pr-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
          />
        </label>
        <input
          name="region"
          defaultValue={region}
          placeholder="지역"
          className="h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
        />
        <input
          name="service"
          defaultValue={service}
          placeholder="서비스 유형"
          className="h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
        />
        <select
          name="urgency"
          defaultValue={urgency ?? ""}
          className="h-10 px-3 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand"
        >
          <option value="">긴급도 전체</option>
          {Object.entries(URGENCY_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
        <select
          name="sort"
          defaultValue={sort}
          className="h-10 px-3 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand"
        >
          <option value="newest">최신순</option>
          <option value="urgent">긴급순</option>
          <option value="deadline">마감임박순</option>
          <option value="budget">예산높은순</option>
          <option value="fewest">신청적은순</option>
        </select>
        <button className="h-10 px-4 rounded-lg bg-gray-900 text-white text-sm font-semibold">
          검색
        </button>
        {scope === "mine" && <input type="hidden" name="scope" value="mine" />}
      </form>

      <div className="flex items-center gap-2">
        <Link
          href={boardHref}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium ${scope === "board" ? "bg-gray-900 text-white" : "bg-white text-gray-600 border border-gray-200"}`}
        >
          전체 SOS
        </Link>
        <Link
          href={mineHref}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium ${scope === "mine" ? "bg-gray-900 text-white" : "bg-white text-gray-600 border border-gray-200"}`}
        >
          {session.user.role === UserRole.COMPANY_OWNER ? "내가 올린 글" : "내 신청 글"}
        </Link>
      </div>

      {sosRequests.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-card">
          <EmptyState
            icon={Zap}
            title="조건에 맞는 SOS 요청이 없습니다"
            description="검색 조건을 조정하거나 새 긴급 요청을 등록해 보세요."
            action={canCreate ? { label: "새 SOS 등록", href: "/sos/new" } : undefined}
          />
        </div>
      ) : (
        <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-sm">
              <thead className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">긴급도</th>
                  <th className="px-4 py-3 text-left font-semibold">제목</th>
                  <th className="px-4 py-3 text-left font-semibold">지역</th>
                  <th className="px-4 py-3 text-left font-semibold">일정</th>
                  <th className="px-4 py-3 text-left font-semibold">인원</th>
                  <th className="px-4 py-3 text-left font-semibold">유형</th>
                  <th className="px-4 py-3 text-right font-semibold">예산</th>
                  <th className="px-4 py-3 text-center font-semibold">신청</th>
                  <th className="px-4 py-3 text-left font-semibold">작성자</th>
                  <th className="px-4 py-3 text-left font-semibold">등록</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sosRequests.map((req) => {
                  const isOwner = company?.id === req.companyId
                  const myApplication = req.sosApplications[0]
                  return (
                    <tr key={req.id} className="hover:bg-gray-50/80">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <StatusBadge
                          variant={URGENCY_VARIANTS[req.urgencyLevel]}
                          label={URGENCY_LABELS[req.urgencyLevel]}
                        />
                      </td>
                      <td className="px-4 py-3 min-w-[260px]">
                        <Link href={`/sos/${req.id}`} className="font-semibold text-gray-900 hover:text-brand">
                          {req.title}
                        </Link>
                        <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                          <StatusBadge
                            variant={sosStatusVariant(req.status)}
                            label={SOS_STATUS_LABELS[req.status] ?? req.status}
                            className="px-2 py-0.5"
                          />
                          {myApplication && <span className="text-brand font-medium">내 신청: {myApplication.status}</span>}
                          {isOwner && <span className="text-sos font-medium">내 글</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-gray-700">
                        {req.region || [req.city, req.district].filter(Boolean).join(" ") || "지역 협의"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-gray-700">
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-gray-400" />
                          {formatDateTime(req.scheduledAt)}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-gray-700">
                        <span className="inline-flex items-center gap-1">
                          <Users className="w-3.5 h-3.5 text-gray-400" />
                          {req.requiredCount}명
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-gray-700">
                        {req.serviceType ?? req.requiredFields.map((f) => WORK_FIELD_LABELS[f] ?? f).join(", ")}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right font-semibold text-gray-900">
                        {(req.budgetTotal ?? req.hourlyRate * req.requiredCount).toLocaleString()}원
                      </td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 justify-center">
                          {req._count.sosApplications}
                          {req._count.sosMatches > 0 && (
                            <span className="text-xs text-gray-400">+알림 {req._count.sosMatches}</span>
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-gray-700">{req.company.name}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-gray-500">
                        {new Date(req.createdAt).toLocaleDateString("ko-KR", { month: "2-digit", day: "2-digit" })}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-t border-gray-100 text-xs text-gray-500">
            <AlertTriangle className="w-3.5 h-3.5" />
            연락처와 상세 현장 정보는 게시 업체 또는 신청 승인 흐름에서만 노출됩니다.
          </div>
        </div>
      )}
    </div>
  )
}
