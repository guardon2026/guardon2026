export const dynamic = 'force-dynamic'
import { NextResponse } from "next/server"
import { getServerSession } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { SosMatchStatus } from "@prisma/client"

export async function GET() {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "no session", step: "session" })
    }

    const workerProfile = await prisma.workerProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    })

    if (!workerProfile) {
      return NextResponse.json({ ok: true, step: "no_profile", userId: session.user.id, role: session.user.role })
    }

    const [notifiedMatches, unreadSystem, pointAccount] = await Promise.all([
      prisma.sosMatch.count({
        where: { workerProfileId: workerProfile.id, status: SosMatchStatus.NOTIFIED },
      }),
      prisma.notification.count({
        where: { userId: session.user.id, isRead: false },
      }),
      prisma.pointAccount.findUnique({
        where: { userId: session.user.id },
        select: { balance: true },
      }),
    ])

    return NextResponse.json({
      ok: true,
      step: "complete",
      notifiedMatches,
      unreadSystem,
      balance: pointAccount?.balance ?? 0,
    })
  } catch (err) {
    return NextResponse.json({ error: String(err), step: "error" }, { status: 500 })
  }
}
