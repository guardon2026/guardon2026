export const dynamic = 'force-dynamic'
import { NextResponse } from "next/server"
import { getServerSession } from "@/lib/session"
import { prisma } from "@/lib/prisma"

export async function POST() {
  const session = await getServerSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그?�이 ?�요?�니??" }, { status: 401 })
  }

  await prisma.notification.updateMany({
    where: { userId: session.user.id, isRead: false },
    data: { isRead: true },
  })

  return NextResponse.json({ success: true })
}
