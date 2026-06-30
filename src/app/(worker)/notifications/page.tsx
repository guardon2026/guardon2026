import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "@/lib/session"
import { UserRole, SosMatchStatus } from "@prisma/client"
import { Bell } from "lucide-react"
import { PageHeader } from "@/components/ui/page-header"
import { StatusBadge } from "@/components/ui/status-badge"
import { EmptyState } from "@/components/ui/empty-state"
import {
  SOS_NOTIFICATION_LABELS,
  WORK_FIELD_LABELS,
  CREDENTIAL_LABELS,
} from "@/lib/constants"
import NotificationActions from "./NotificationActions"

// ─────────────────────────────────────────
// 타입
// ─────────────────────────────────────────

type MatchWithRequest = Awaited<ReturnType<typeof loadMatches>>[number]

// ─────────────────────────────────────────
// 데이터 로딩
// ─────────────────────────────────────────

async function loadMatches(workerProfileId: string) {
  return prisma.sosMatch.findMany({
    where: {
      workerProfileId,
      status: {
        in: [
          SosMatchStatus.NOTIFIED,
          SosMatchStatus.ACCEPTED,
          SosMatchStatus.REJECTED,
          SosMatchStatus.CONFIRMED,
        ],
      },
    },
    include: {
      sosRequest: {
        select: {
          id: true,
          title: true,
          locationAddress: true,
          scheduledAt: true,
          hourlyRate: true,
          requiredCredentials: true,
          requiredFields: true,
          status: true,
        },
      },
    },
    orderBy: { notifiedAt: "desc" },
  })
}

// ─────────────────────────────────────────
// 상대 시간 포맷
// ─────────────────────────────────────────

function relativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  if (diffSec < 60) return "방금 전"
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}분 전`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}시간 전`
  const diffDay = Math.floor(diffHr / 24)
  return `${diffDay}일 전`
}

// ─────────────────────────────────────────
// 알림 카드 상태 배지
// ─────────────────────────────────────────

function matchStatusBadge(status: SosMatchStatus) {
  switch (status) {
    case "NOTIFIED":  return <StatusBadge variant="pending" label="대기 중" />
    case "ACCEPTED":  return <StatusBadge variant="confirmed" label="수락함" />
    case "REJECTED":  return <StatusBadge variant="rejected" label="거절함" />
    case "CONFIRMED": return <StatusBadge variant="approved" label="확정됨" />
    default:          return null
  }
}

// ─────────────────────────────────────────
// 알림 카드 (Server Component)
// ─────────────────────────────────────────

function NotificationCard({ match }: { match: MatchWithRequest }) {
  const req = match.sosRequest
  const isNotified = match.status === SosMatchStatus.NOTIFIED
  const isRead = match.status !== SosMatchStatus.NOTIFIED

  return (
    <div
      className={`rounded-xl border p-4 space-y-3 transition-colors ${
        isRead
          ? "bg-white border-gray-100 opacity-75"
          : "bg-blue-50/30 border-l-4 border-l-brand border-gray-100"
      }`}
    >
      {/* 헤더 */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 leading-snug">{req.title}</p>
          <p className="text-xs text-gray-400 mt-0.5">{relativeTime(new Date(match.notifiedAt))}</p>
        </div>
        {matchStatusBadge(match.status)}
      </div>

      {/* 상세 정보 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
        <InfoRow label={SOS_NOTIFICATION_LABELS.CARD.LOCATION_LABEL} value={req.locationAddress} />
        <InfoRow
          label={SOS_NOTIFICATION_LABELS.CARD.SCHEDULED_AT_LABEL}
          value={new Date(req.scheduledAt).toLocaleString("ko-KR", {
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        />
        <InfoRow
          label={SOS_NOTIFICATION_LABELS.CARD.HOURLY_RATE_LABEL}
          value={`${req.hourlyRate.toLocaleString()}${SOS_NOTIFICATION_LABELS.CARD.HOURLY_RATE_UNIT}`}
        />
        {req.requiredFields.length > 0 && (
          <InfoRow
            label="업무 분야"
            value={req.requiredFields.map((f) => WORK_FIELD_LABELS[f] ?? f).join(", ")}
          />
        )}
        {req.requiredCredentials.length > 0 && (
          <InfoRow
            label={SOS_NOTIFICATION_LABELS.CARD.CREDENTIALS_LABEL}
            value={req.requiredCredentials.map((c) => CREDENTIAL_LABELS[c] ?? c).join(", ")}
          />
        )}
      </div>

      {/* 수락/거절 버튼 (NOTIFIED 상태만) */}
      {isNotified && <NotificationActions matchId={match.id} />}
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-1.5">
      <span className="text-gray-400 w-20 shrink-0 pt-0.5">{label}</span>
      <span className="text-gray-700">{value}</span>
    </div>
  )
}

// ─────────────────────────────────────────
// 페이지 (Server Component)
// ─────────────────────────────────────────

export default async function NotificationsPage() {
  const session = await getServerSession()
  if (!session?.user?.id) redirect("/login")
  if (session.user.role !== UserRole.WORKER) redirect("/")

  const workerProfile = await prisma.workerProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  })

  if (!workerProfile) redirect("/profile/edit")

  const matches = await loadMatches(workerProfile.id)

  const unreadCount = matches.filter((m) => m.status === SosMatchStatus.NOTIFIED).length

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        title={SOS_NOTIFICATION_LABELS.PAGE_TITLE}
        badge={
          unreadCount > 0
            ? { label: `${unreadCount}개 대기`, variant: "warning" }
            : undefined
        }
      />

      {matches.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="아직 알림이 없습니다"
          description="SOS 요청이 발송되면 이 곳에 표시됩니다."
        />
      ) : (
        <div className="space-y-3">
          {matches.map((m) => (
            <NotificationCard key={m.id} match={m} />
          ))}
        </div>
      )}
    </div>
  )
}
