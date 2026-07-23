export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "@/lib/session"
import { UserRole } from "@prisma/client"

// PATCH /api/admin/tax/[txId] — taxCompleted 토글
export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ txId: string }> }
) {
  const session = await getServerSession()
  if (!session || session.user.role !== UserRole.ADMIN) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 })
  }

  const { txId } = await params

  const tx = await prisma.pointTransaction.findUnique({
    where: { id: txId },
    select: { taxCompleted: true },
  })
  if (!tx) return NextResponse.json({ error: "내역을 찾을 수 없습니다." }, { status: 404 })

  const updated = await prisma.pointTransaction.update({
    where: { id: txId },
    data: { taxCompleted: !tx.taxCompleted },
    select: { taxCompleted: true },
  })

  return NextResponse.json({ taxCompleted: updated.taxCompleted })
}
