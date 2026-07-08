import { NextRequest, NextResponse } from "next/server"
import { SosStatus } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "@/lib/session"

const MODERATION_STATUSES: SosStatus[] = ["CANCELLED", "UNRESOLVED", "COMPLETED"]

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const session = await getServerSession()
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "관리자 권한이 필요합니다." }, { status: 403 })
  }

  let body: { status?: SosStatus; reason?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "잘못된 요청 형식입니다." }, { status: 400 })
  }

  if (!body.status || !MODERATION_STATUSES.includes(body.status)) {
    return NextResponse.json({ error: "운영 처리할 수 없는 상태입니다." }, { status: 400 })
  }

  const now = new Date()
  const sos = await prisma.$transaction(async (tx) => {
    const updated = await tx.sosRequest.update({
      where: { id },
      data: {
        status: body.status,
        closedAt: body.status === "CANCELLED" || body.status === "COMPLETED" ? now : undefined,
        cancelledAt: body.status === "CANCELLED" ? now : undefined,
        unresolvedAt: body.status === "UNRESOLVED" ? now : undefined,
      },
      select: { id: true, status: true },
    })
    await tx.auditLog.create({
      data: {
        actorUserId: session.user.id,
        action: "SOS_MODERATION_UPDATE",
        targetType: "SOS_REQUEST",
        targetId: id,
        metadata: { status: body.status, reason: body.reason ?? null },
      },
    })
    return updated
  })

  return NextResponse.json({ sos })
}
