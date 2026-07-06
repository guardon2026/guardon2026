import { Header } from "@/components/ui/header"
import { getServerSession } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { SosMatchStatus } from "@prisma/client"

export default async function WorkerLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession()

  let unreadNotifications = 0
  let pointBalance = 0
  if (session?.user?.id) {
    const workerProfile = await prisma.workerProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    })

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

  return (
    <div className="min-h-screen bg-gray-50">
      <Header role="WORKER" unreadNotifications={unreadNotifications} pointBalance={pointBalance} />
      <main className="max-w-7xl mx-auto px-4 py-6">{children}</main>
    </div>
  )
}
