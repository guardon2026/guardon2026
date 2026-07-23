export const dynamic = 'force-dynamic'
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "@/lib/session"

// GET /api/points/balance ??蹂몄씤 ?占쎌씤???占쎌븸 議고쉶
export async function GET() {
  const session = await getServerSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "濡쒓렇?占쎌씠 ?占쎌슂?占쎈땲??" }, { status: 401 })
  }

  const account = await prisma.pointAccount.findUnique({
    where: { userId: session.user.id },
    include: {
      transactions: {
        orderBy: { createdAt: "desc" },
        take: 50,
      },
    },
  })

  return NextResponse.json({
    balance: account?.balance ?? 0,
    transactions: account?.transactions ?? [],
  })
}
