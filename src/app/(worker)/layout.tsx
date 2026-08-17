import { XCircle } from "lucide-react"
import { Header } from "@/components/ui/header"
import { getServerSession } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { SosMatchStatus } from "@prisma/client"
import { getWorkerSuspension } from "@/lib/worker-gate"
import { WORKER_SUSPENDED } from "@/lib/constants"

export default async function WorkerLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession()

  let unreadNotifications = 0
  let pointBalance = 0
  let suspension = { suspended: false, noShowCount: 0 }
  if (session?.user?.id) {
    const [workerProfile, workerSuspension] = await Promise.all([
      prisma.workerProfile.findUnique({
        where: { userId: session.user.id },
        select: { id: true },
      }),
      getWorkerSuspension(session.user.id),
    ])
    suspension = workerSuspension

    if (workerProfile) {
      const [notifiedMatches, unreadSystem, pointAccount] = await Promise.all([
        prisma.sosMatch.count({
          where: {
            workerProfileId: workerProfile.id,
            status: SosMatchStatus.NOTIFIED,
          },
        }),
        prisma.notification.count({
          where: { userId: session.user.id, isRead: false },
        }),
        prisma.pointAccount.findUnique({
          where: { userId: session.user.id },
          select: { balance: true },
        }),
      ])
      unreadNotifications = notifiedMatches + unreadSystem
      pointBalance = pointAccount?.balance ?? 0
    }
  }

  if (suspension.suspended) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header role="WORKER" unreadNotifications={unreadNotifications} pointBalance={pointBalance} />
        <main className="max-w-7xl mx-auto px-4 py-6">
          <div className="max-w-md mx-auto mt-16 text-center space-y-4 p-8 bg-white rounded-2xl shadow-sm border border-gray-100">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto">
              <XCircle className="w-6 h-6 text-[#DC2626]" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">{WORKER_SUSPENDED.HEADING}</h2>
            <p className="text-sm text-gray-500">{WORKER_SUSPENDED.BODY}</p>
            <p className="text-xs text-gray-400">노쇼 누적: {suspension.noShowCount}회</p>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header role="WORKER" unreadNotifications={unreadNotifications} pointBalance={pointBalance} />
      <main className="max-w-7xl mx-auto px-4 py-6">{children}</main>
    </div>
  )
}
