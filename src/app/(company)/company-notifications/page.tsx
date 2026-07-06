import { redirect } from "next/navigation"
import Link from "next/link"
import { Bell, CheckCircle2 } from "lucide-react"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "@/lib/session"
import { UserRole } from "@prisma/client"
import { PageHeader } from "@/components/ui/page-header"
import { EmptyState } from "@/components/ui/empty-state"
import MarkNotificationsRead from "@/components/ui/mark-notifications-read"

function relativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  if (diffSec < 60) return "방금 전"
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}분 전`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}시간 전`
  return `${Math.floor(diffHr / 24)}일 전`
}

export default async function CompanyNotificationsPage() {
  const session = await getServerSession()
  if (!session?.user?.id) redirect("/login")
  if (session.user.role !== UserRole.COMPANY_OWNER) redirect("/")

  const notifications = await prisma.notification.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  })

  const unreadCount = notifications.filter((n) => !n.isRead).length

  return (
    <div className="space-y-6 pb-10">
      <MarkNotificationsRead />
      <PageHeader
        title="알림"
        badge={
          unreadCount > 0
            ? { label: `${unreadCount}개 미확인`, variant: "warning" }
            : undefined
        }
      />

      {notifications.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="아직 알림이 없습니다"
          description="경비 인력 임무 완료 보고 등 중요 알림이 여기에 표시됩니다."
        />
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => {
            const isMissionComplete = n.type === "MISSION_COMPLETE"
            return (
              <div
                key={n.id}
                className={`rounded-xl border p-4 space-y-2 transition-colors ${
                  n.isRead
                    ? "bg-white border-gray-100 opacity-80"
                    : isMissionComplete
                    ? "bg-green-50/40 border-l-4 border-l-green-500 border-gray-100"
                    : "bg-amber-50/40 border-l-4 border-l-amber-400 border-gray-100"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2 flex-1 min-w-0">
                    {isMissionComplete && (
                      <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900">{n.title}</p>
                      <p className="text-xs text-gray-600 mt-0.5 leading-snug">{n.body}</p>
                      <p className="text-xs text-gray-400 mt-1">{relativeTime(new Date(n.createdAt))}</p>
                    </div>
                  </div>
                  {n.sosRequestId && (
                    <Link
                      href={`/sos/${n.sosRequestId}`}
                      className="shrink-0 text-xs text-brand font-medium hover:underline"
                    >
                      상세 보기
                    </Link>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
