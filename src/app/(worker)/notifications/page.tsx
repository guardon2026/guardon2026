import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "@/lib/session"
import { UserRole, SosMatchStatus } from "@prisma/client"
import { Bell, MapPin, Zap, Users, Shirt, FileText, Phone, MessageCircle, Lock } from "lucide-react"
import { PageHeader } from "@/components/ui/page-header"
import { StatusBadge } from "@/components/ui/status-badge"
import { EmptyState } from "@/components/ui/empty-state"
import {
  SOS_NOTIFICATION_LABELS,
  WORK_FIELD_LABELS,
  CREDENTIAL_LABELS,
  DRESS_CODE_LABELS,
} from "@/lib/constants"
import NotificationActions from "./NotificationActions"
import SystemNotificationCard from "./SystemNotificationCard"
import MarkNotificationsRead from "@/components/ui/mark-notifications-read"
import { ScheduleDayList } from "@/components/sos/ScheduleDayList"
import { getWorkerCompleteness, WORKER_COMPLETENESS_SELECT } from "@/lib/worker-completeness"
import { ProfileCompletenessBanner } from "@/components/worker/ProfileCompletenessBanner"
import { toISODate } from "@/lib/sos-matcher"

const CLOSED_SOS_STATUSES = new Set(["CANCELLED", "COMPLETED", "UNRESOLVED"])

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

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
      <div className="min-w-0">
        <span className="text-gray-400">{label} </span>
        <span className="text-gray-800 font-medium">{value}</span>
      </div>
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
  scheduleDate: string
  notifiedAt: Date
  isPast: boolean
  sosRequest: {
    id: string
    title: string
    locationAddress: string
    scheduledAt: Date
    scheduledEndAt: Date | null
    scheduleDays: unknown
    requiredCount: number
    hourlyRate: number
    requiredCredentials: string[]
    requiredFields: string[]
    dressCode: string | null
    description: string | null
    siteManagerContact: string | null
    kakaoOpenChatUrl: string | null
    status: string
    createdAt: Date
  }
}

function MatchCard({ item }: { item: MatchItem }) {
  const req = item.sosRequest
  const isNotified = item.status === SosMatchStatus.NOTIFIED
  const isRead = item.status !== SosMatchStatus.NOTIFIED
  const showActions = isNotified && !item.isPast

  return (
    <div
      className={`rounded-xl border overflow-hidden ${
        item.isPast
          ? "bg-gray-50 border-gray-100 opacity-60"
          : isRead
          ? "bg-white border-gray-100 opacity-80"
          : "bg-blue-50/20 border-l-4 border-l-brand border-gray-100"
      }`}
    >
      <div className="p-4 space-y-4">
        {/* 헤더: 제목 + 상태 */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 leading-snug">{req.title}</p>
            <p className="text-xs text-gray-400 mt-0.5">{relativeTime(new Date(item.notifiedAt))}</p>
          </div>
          <div className="shrink-0">
            {item.isPast
              ? <StatusBadge variant="unresolved" label="지난 SOS" />
              : matchStatusBadge(item.status)
            }
          </div>
        </div>

        {/* 구분선 */}
        <div className="border-t border-gray-100" />

        {/* 기본 정보 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          <InfoRow icon={MapPin} label="집결지" value={req.locationAddress} />
          <InfoRow icon={Zap} label="일급" value={`${req.hourlyRate.toLocaleString()}원/일`} />
          <InfoRow icon={Users} label="필요 인원" value={`총 ${req.requiredCount}명`} />
          {req.dressCode && (
            <InfoRow icon={Shirt} label="복장" value={DRESS_CODE_LABELS[req.dressCode] ?? req.dressCode} />
          )}
        </div>

        {/* 업무 분야 */}
        {req.requiredFields.length > 0 && (
          <div className="text-xs space-y-1.5">
            <p className="text-gray-400">업무 분야</p>
            <div className="flex flex-wrap gap-1.5">
              {req.requiredFields.map((f) => (
                <span key={f} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
                  {WORK_FIELD_LABELS[f] ?? f}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 필요 자격증 */}
        {req.requiredCredentials.length > 0 && (
          <div className="text-xs space-y-1.5">
            <p className="text-gray-400">필요 자격증</p>
            <div className="flex flex-wrap gap-1.5">
              {req.requiredCredentials.map((c) => (
                <span key={c} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                  {CREDENTIAL_LABELS[c] ?? c}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 배치 일정 — 이 카드가 대응하는 날짜(내 매치)를 강조 표시 */}
        <div className="text-xs space-y-1.5">
          <p className="text-gray-400">배치 일정</p>
          <ScheduleDayList
            scheduleDays={req.scheduleDays}
            scheduledAt={req.scheduledAt}
            scheduledEndAt={req.scheduledEndAt}
            highlightDate={item.scheduleDate}
            compact
          />
        </div>

        {/* 현장 담당자 연락처 */}
        {req.siteManagerContact && (
          <div className="text-xs space-y-1.5">
            <p className="text-gray-400">현장 담당자 연락처</p>
            {isNotified ? (
              /* 수락 전 — 블러 처리 */
              <div className="relative p-2 rounded-lg bg-gray-50 overflow-hidden">
                <div className="flex items-center gap-2 select-none pointer-events-none blur-[4px]">
                  <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  <span className="font-medium text-gray-800">{req.siteManagerContact.split("\n")[0]}</span>
                </div>
                <div className="absolute inset-0 flex items-center justify-center gap-1.5 text-gray-500">
                  <Lock className="w-3 h-3" />
                  <span className="text-xs">SOS 요청 수락 후 확인할 수 있습니다.</span>
                </div>
              </div>
            ) : (
              /* 수락 후 — 실제 연락처 표시 */
              <div className="space-y-1">
                {req.siteManagerContact.split("\n").map((line, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-gray-50">
                    <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span className="font-medium text-gray-800">{line}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 추가 설명 */}
        {req.description && (
          <div className="text-xs space-y-1.5">
            <p className="text-gray-400">추가 설명</p>
            <div className="flex items-start gap-2 p-2 rounded-lg bg-gray-50">
              <FileText className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
              <p className="text-gray-700 whitespace-pre-line">{req.description}</p>
            </div>
          </div>
        )}
      </div>

      {/* 수락 전 — 카카오톡 문의하기 버튼 + 수락/거절 버튼 (지난 SOS는 숨김) */}
      {showActions && (
        <div className="px-4 pb-4 space-y-2">
          {req.kakaoOpenChatUrl && (
            <a
              href={req.kakaoOpenChatUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-yellow-400 hover:bg-yellow-500 transition-colors text-sm font-semibold text-gray-900"
            >
              <MessageCircle className="w-4 h-4" />
              카카오톡으로 문의하기
            </a>
          )}
          <NotificationActions matchId={item.id} />
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────
// 시스템 알림 타입
// ─────────────────────────────────────────

type SystemItem = {
  kind: "system"
  sortKey: Date
  id: string
  title: string
  body: string
  type: string
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
    select: { id: true, ...WORKER_COMPLETENESS_SELECT },
  })
  if (!workerProfile) redirect("/profile")
  const { missing: missingProfileItems } = getWorkerCompleteness(workerProfile)

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
          scheduledEndAt: true,
          scheduleDays: true,
          requiredCount: true,
          hourlyRate: true,
          requiredCredentials: true,
          requiredFields: true,
          dressCode: true,
          description: true,
          siteManagerContact: true,
          kakaoOpenChatUrl: true,
          status: true,
          createdAt: true,
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
  const todayStr = toISODate(new Date())
  const matchItems: MatchItem[] = matches.map((m) => ({
    kind: "match",
    sortKey: new Date(m.notifiedAt),
    id: m.id,
    status: m.status,
    scheduleDate: m.scheduleDate,
    notifiedAt: new Date(m.notifiedAt),
    isPast: CLOSED_SOS_STATUSES.has(m.sosRequest.status) || m.scheduleDate < todayStr,
    sosRequest: m.sosRequest,
  }))

  const systemItems: SystemItem[] = systemNotifications.map((n) => ({
    kind: "system",
    sortKey: new Date(n.createdAt),
    id: n.id,
    title: n.title,
    body: n.body,
    type: n.type,
    isRead: n.isRead,
    createdAt: new Date(n.createdAt),
    sosRequestId: n.sosRequestId,
  }))

  const allItems = [...matchItems, ...systemItems].sort((a, b) => {
    const diff = b.sortKey.getTime() - a.sortKey.getTime()
    if (diff !== 0) return diff
    // notifiedAt이 동일하면 SOS 생성 시각(최신 SOS 우선) 기준 2차 정렬
    const aCreated = a.kind === "match" ? new Date(a.sosRequest.createdAt).getTime() : 0
    const bCreated = b.kind === "match" ? new Date(b.sosRequest.createdAt).getTime() : 0
    return bCreated - aCreated
  })

  const unreadCount =
    matches.filter((m) => m.status === SosMatchStatus.NOTIFIED).length +
    systemNotifications.filter((n) => !n.isRead).length

  return (
    <div className="space-y-6 pb-10">
      <MarkNotificationsRead />
      <PageHeader
        title={SOS_NOTIFICATION_LABELS.PAGE_TITLE}
        badge={
          unreadCount > 0
            ? { label: `${unreadCount}개 대기`, variant: "warning" }
            : undefined
        }
      />

      {missingProfileItems.length > 0 && <ProfileCompletenessBanner missing={missingProfileItems} />}

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
                type={item.type}
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
