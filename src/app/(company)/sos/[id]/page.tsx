import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { MapPin, Calendar, Users, Zap, ArrowLeft, Pencil } from "lucide-react"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "@/lib/session"
import { requireApprovedCompany, CompanyNotApprovedError } from "@/lib/company-gate"
import { PageHeader } from "@/components/ui/page-header"
import { StatusBadge } from "@/components/ui/status-badge"
import {
  SOS_DETAIL,
  SOS_STATUS_LABELS,
  WORK_FIELD_LABELS,
  CREDENTIAL_LABELS,
} from "@/lib/constants"
import { SosMatchStatus } from "@prisma/client"
import type { StatusVariant } from "@/components/ui/status-badge"
import WorkerMatchGroup from "./WorkerDetailModal"

interface SosDetailPageProps {
  params: Promise<{ id: string }>
}

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

function matchStatusVariant(status: string): StatusVariant {
  switch (status) {
    case "NOTIFIED":  return "pending"
    case "ACCEPTED":  return "active"
    case "REJECTED":  return "rejected"
    case "CONFIRMED": return "confirmed"
    default:          return "unresolved"
  }
}

const MATCH_GROUP_LABELS: Record<SosMatchStatus, string> = {
  CONFIRMED: "확정",
  ACCEPTED:  "수락",
  NOTIFIED:  "대기",
  REJECTED:  "거절",
}

const MATCH_ORDER: SosMatchStatus[] = [
  SosMatchStatus.CONFIRMED,
  SosMatchStatus.ACCEPTED,
  SosMatchStatus.NOTIFIED,
  SosMatchStatus.REJECTED,
]

export default async function SosDetailPage({ params }: SosDetailPageProps) {
  const { id } = await params

  const session = await getServerSession()
  if (!session?.user?.id) redirect("/login")

  let company
  try {
    company = await requireApprovedCompany(session.user.id)
  } catch (e) {
    if (e instanceof CompanyNotApprovedError) redirect("/pending")
    throw e
  }

  const sosRequest = await prisma.sosRequest.findUnique({
    where: { id },
    include: {
      sosMatches: {
        include: {
          workerProfile: {
            select: {
              id: true,
              experienceYears: true,
              workFields: true,
              declaredCredentials: true,
              desiredHourlyRate: true,
              height: true,
              weight: true,
              profileImageUrl: true,
              bio: true,
              user: { select: { id: true, name: true } },
              credentials: {
                where: { status: "APPROVED" },
                select: { type: true },
              },
            },
          },
        },
        orderBy: { notifiedAt: "asc" },
      },
    },
  })

  if (!sosRequest) notFound()
  if (sosRequest.companyId !== company.id) notFound()

  // 매칭 상태별 그룹
  const matchGroups: Record<SosMatchStatus, typeof sosRequest.sosMatches> = {
    NOTIFIED: [], ACCEPTED: [], REJECTED: [], CONFIRMED: [],
  }
  for (const m of sosRequest.sosMatches) {
    matchGroups[m.status].push(m)
  }

  const confirmedCount = matchGroups[SosMatchStatus.CONFIRMED].length
  const acceptedCount  = matchGroups[SosMatchStatus.ACCEPTED].length

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">

        {/* 헤더 */}
        <PageHeader
          title={sosRequest.title}
          subtitle={SOS_DETAIL.PAGE_TITLE}
          badge={undefined}
          action={
            <div className="flex items-center gap-2">
              <StatusBadge
                variant={sosStatusVariant(sosRequest.status)}
                label={SOS_STATUS_LABELS[sosRequest.status] ?? sosRequest.status}
              />
            </div>
          }
        />

        {/* 요청 개요 카드 */}
        <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6 space-y-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">요청 정보</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InfoItem icon={Calendar} label={SOS_DETAIL.SCHEDULED_AT_LABEL}
              value={new Date(sosRequest.scheduledAt).toLocaleString("ko-KR", {
                year: "numeric", month: "long", day: "numeric",
                hour: "2-digit", minute: "2-digit",
              })}
            />
            <InfoItem icon={MapPin} label={SOS_DETAIL.LOCATION_LABEL}
              value={sosRequest.locationAddress}
            />
            <InfoItem icon={Users} label={SOS_DETAIL.REQUIRED_COUNT_LABEL}
              value={`${sosRequest.requiredCount}${SOS_DETAIL.REQUIRED_COUNT_UNIT}`}
            />
            <InfoItem icon={Zap} label={SOS_DETAIL.HOURLY_RATE_LABEL}
              value={`${sosRequest.hourlyRate.toLocaleString()}${SOS_DETAIL.HOURLY_RATE_UNIT}`}
            />
          </div>

          {sosRequest.requiredFields.length > 0 && (
            <div>
              <p className="text-xs text-gray-400 mb-1.5">{SOS_DETAIL.WORK_FIELDS_LABEL}</p>
              <div className="flex flex-wrap gap-1.5">
                {sosRequest.requiredFields.map((f) => (
                  <span key={f} className="px-2.5 py-1 bg-blue-50 text-brand text-xs font-medium rounded-full">
                    {WORK_FIELD_LABELS[f] ?? f}
                  </span>
                ))}
              </div>
            </div>
          )}

          {sosRequest.requiredCredentials.length > 0 && (
            <div>
              <p className="text-xs text-gray-400 mb-1.5">{SOS_DETAIL.CREDENTIALS_LABEL}</p>
              <div className="flex flex-wrap gap-1.5">
                {sosRequest.requiredCredentials.map((c) => (
                  <span key={c} className="px-2.5 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
                    {CREDENTIAL_LABELS[c] ?? c}
                  </span>
                ))}
              </div>
            </div>
          )}

          {sosRequest.dressCode && (
            <div>
              <p className="text-xs text-gray-400 mb-1">복장 규정</p>
              <p className="text-sm text-gray-700 font-medium">{sosRequest.dressCode}</p>
            </div>
          )}

          {sosRequest.siteManagerContact && (
            <div>
              <p className="text-xs text-gray-400 mb-1">현장 담당자 연락처</p>
              <div className="space-y-0.5">
                {sosRequest.siteManagerContact.split("\n").map((line, i) => (
                  <p key={i} className="text-sm text-gray-700 font-medium">{line}</p>
                ))}
              </div>
            </div>
          )}

          {sosRequest.description && (
            <div>
              <p className="text-xs text-gray-400 mb-1">{SOS_DETAIL.DESCRIPTION_LABEL}</p>
              <p className="text-sm text-gray-700">{sosRequest.description}</p>
            </div>
          )}
        </div>

        {/* 매칭 현황 */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-gray-900">{SOS_DETAIL.MATCH_SECTION_TITLE}</h2>
            <span className="text-sm text-gray-500">
              {confirmedCount}/{sosRequest.requiredCount}명 확정
              {acceptedCount > 0 && (
                <span className="ml-2 text-brand font-medium">({acceptedCount}명 수락 대기)</span>
              )}
            </span>
          </div>

          {sosRequest.sosMatches.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-8 text-center">
              <p className="text-sm text-gray-400">{SOS_DETAIL.NO_MATCHES}</p>
            </div>
          ) : (
            MATCH_ORDER.map((status) => (
              <WorkerMatchGroup
                key={status}
                status={status}
                label={MATCH_GROUP_LABELS[status]}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                matches={matchGroups[status] as any}
                sosRequestId={sosRequest.id}
              />
            ))
          )}
        </div>

        {/* 하단 버튼 */}
        <div className="flex gap-3">
          <Link
            href="/sos"
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-gray-200
                       text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {SOS_DETAIL.BACK_BUTTON}
          </Link>
          {!["COMPLETED", "CANCELLED"].includes(sosRequest.status) && (
            <Link
              href={`/sos/${sosRequest.id}/edit`}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-brand
                         text-sm text-brand font-semibold hover:bg-brand hover:text-white transition-colors"
            >
              <Pencil className="w-4 h-4" />
              요청 수정
            </Link>
          )}
          <Link
            href="/sos/new"
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-sos text-white
                       text-sm font-semibold hover:bg-red-700 transition-colors"
          >
            <Zap className="w-4 h-4" />
            {SOS_DETAIL.NEW_SOS_BUTTON}
          </Link>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────
// 서브 컴포넌트
// ─────────────────────────────────────────

function InfoItem({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
}) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
      <div>
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-sm font-medium text-gray-900 mt-0.5">{value}</p>
      </div>
    </div>
  )
}

