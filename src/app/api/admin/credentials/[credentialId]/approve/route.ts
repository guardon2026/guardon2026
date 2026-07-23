export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { createNotifications } from "@/lib/notify"
import { CREDENTIAL_LABELS } from "@/lib/constants"

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
    include: { workerProfile: { select: { userId: true } } },
  })

  const credLabel = CREDENTIAL_LABELS[existing.type] ?? existing.type
  void createNotifications([{
    userId: credential.workerProfile.userId,
    type: "CREDENTIAL_APPROVED",
    title: "자격증 심사 완료",
    body: `${credLabel} 자격증이 승인되었습니다. 이제 해당 자격증이 필요한 SOS 요청을 수락할 수 있습니다.`,
  }])

  return NextResponse.json({ credential })
}
