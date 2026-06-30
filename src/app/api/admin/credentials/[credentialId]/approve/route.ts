import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/session"
import { prisma } from "@/lib/prisma"

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ credentialId: string }> }
) {
  const session = await getServerSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 })
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "접근 권한이 없습니다." }, { status: 403 })
  }

  const { credentialId } = await params

  const existing = await prisma.credential.findUnique({ where: { id: credentialId } })
  if (!existing) {
    return NextResponse.json({ error: "자격증을 찾을 수 없습니다." }, { status: 404 })
  }

  const credential = await prisma.credential.update({
    where: { id: credentialId },
    data: {
      status: "APPROVED",
      approvedAt: new Date(),
      rejectedAt: null,
      rejectionReason: null,
    },
  })

  return NextResponse.json({ credential })
}
