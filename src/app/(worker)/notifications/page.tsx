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
import SystemNotificationCard from "./SystemNotificationCard"

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

function matchStatusBadge(status: SosMatchStatus) {
  switch (status) {
    case "NOTIFIED":  return <StatusBadge variant="pending" label="대기 중" />
    case "ACCEPTED":  return <StatusBadge variant="confirmed" label="수락함" />
    case "REJECTED":  return <StatusBadge variant="rejected" label="거절함" />
    case "CONFIRMED": return <StatusBadge variant="approved" label="확정됨" />
    default:          return null
  }
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
// SOS 매치 알림 카드
// ─────────────────────────────────────────

type MatchItem = {
  kind: "match"
  sortKey: Date
  id: string
  status: SosMatchStatus
  notifiedAt: Date
  sosRequest: {
    id: string
    title: string
    locationAddress: string
    scheduledAt: Date
    hourlyRate: number
    requiredCredentials: string[]
    requiredFields: string[]
    status: string
  }
}

function MatchCard({ item }: { item: MatchItem }) {
  const req = item.sosRequest
  const isNotified = item.status === SosMatchStatus.NOTIFIED
  const isRead = item.status !== SosMatchStatus.NOTIFIED

  return (
    <div
      className={`rounded-xl border p-4 space-y-3 transition-colors ${
        isRead
          ? "bg-white border-gray-100 opacity-75"
          : "bg-blue-50/30 border-l-4 border-l-brand border-gray-100"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 leading-snug">{req.title}</p>
          <p className="text-xs text-gray-400 mt-0.5">{relativeTime(new Date(item.notifiedAt))}</p>
        </div>
        {matchStatusBadge(item.status)}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
        <InfoRow label={SOS_NOTIFICATION_LABELS.CARD.LOCATION_LABEL} value={req.locationAddress} />
        <InfoRow
          label={SOS_NOTIFICATION_LABELS.CARD.SCHEDULED_AT_LABEL}
          value={new Date(req.scheduledAt).toLocaleString("ko-KR", {
            year: "numeric", month: "long", day: "numeric",
            hour: "2-digit", minute: "2-digit",
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

      {isNotified && <NotificationActions matchId={item.id} />}
    </div>
  )
}

// ─────────────────────────────────────────
// 시스템 알림 (클라이언트 컴포넌트로 위임)
// ─────────────────────────────────────────

type SystemItem = {
  kind: "system"
  sortKey: Date
  id: string
  title: string
  body: string
  isRead: boolean
  createdAt: Date
  sosRequestId: string | null
}

// ─────────────────────────────────────────
// 페이지
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

  // SOS 매치 알림
  const matches = await prisma.sosMatch.findMany({
    where: {
      workerProfileId: workerProfile.id,
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

  // 시스템 알림 (SOS 수정 등) — SOS_REQUEST 타입은 매치카드로 이미 표시되므로 제외
  const systemNotifications = await prisma.notification.findMany({
    where: { userId: session.user.id, type: { not: "SOS_REQUEST" } },
    orderBy: { createdAt: "desc" },
    take: 50,
  })

  // 두 소스를 시간순 병합
  const matchItems: MatchItem[] = matches.map((m) => ({
    kind: "match",
    sortKey: new Date(m.notifiedAt),
    id: m.id,
    status: m.status,
    notifiedAt: new Date(m.notifiedAt),
    sosRequest: m.sosRequest,
  }))

  const systemItems: SystemItem[] = systemNotifications.map((n) => ({
    kind: "system",
    sortKey: new Date(n.createdAt),
    id: n.id,
    title: n.title,
    body: n.body,
    isRead: n.isRead,
    createdAt: new Date(n.createdAt),
    sosRequestId: n.sosRequestId,
  }))

  const allItems = [...matchItems, ...systemItems].sort(
    (a, b) => b.sortKey.getTime() - a.sortKey.getTime(),
  )

  const unreadCount =
    matches.filter((m) => m.status === SosMatchStatus.NOTIFIED).length +
    systemNotifications.filter((n) => !n.isRead).length

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

      {allItems.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="아직 알림이 없습니다"
          description="SOS 요청이 발송되면 이 곳에 표시됩니다."
        />
      ) : (
        <div className="space-y-3">
          {allItems.map((item) =>
            item.kind === "match" ? (
              <MatchCard key={`match-${item.id}`} item={item} />
            ) : (
              <SystemNotificationCard
                key={`sys-${item.id}`}
                id={item.id}
                title={item.title}
                body={item.body}
                isRead={item.isRead}
                createdAt={item.createdAt}
                sosRequestId={item.sosRequestId}
              />
            ),
          )}
        </div>
      )}
    </div>
  )
}
