import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/session"
import { prisma } from "@/lib/prisma"

export async function POST(
  req: NextRequest,
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

  const body = await req.json()
  const rejectionReason: string = (body.rejectionReason ?? "").trim()

  if (!rejectionReason) {
    return NextResponse.json(
      { error: "반려 사유를 입력해야 합니다." },
      { status: 400 }
    )
  }

  const existing = await prisma.credential.findUnique({ where: { id: credentialId } })
  if (!existing) {
    return NextResponse.json({ error: "자격증을 찾을 수 없습니다." }, { status: 404 })
  }

  const credential = await prisma.credential.update({
    where: { id: credentialId },
    data: {
      status: "REJECTED",
      rejectedAt: new Date(),
      approvedAt: null,
      rejectionReason,
    },
  })

  return NextResponse.json({ credential })
}
