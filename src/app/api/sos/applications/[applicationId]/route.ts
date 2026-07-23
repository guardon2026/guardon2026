export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from "next/server"
import { SosApplicationStatus, UserRole } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "@/lib/session"
import { createNotifications } from "@/lib/notify"

const ALLOWED_STATUSES: SosApplicationStatus[] = [
  "REVIEWING",
  "CONTACTED",
  "SELECTED",
  "REJECTED",
  "CANCELLED",
  "REPORTED",
]

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ applicationId: string }> },
) {
  const { applicationId } = await params
  const session = await getServerSession()
  if (!session?.user?.id || !session.user.role) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 })
  }

  let body: { status?: SosApplicationStatus; adminMemo?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "잘못된 요청 형식입니다." }, { status: 400 })
  }

  if (!body.status || !ALLOWED_STATUSES.includes(body.status)) {
    return NextResponse.json({ error: "변경할 수 없는 신청 상태입니다." }, { status: 400 })
  }

  const application = await prisma.sosApplication.findUnique({
    where: { id: applicationId },
    include: {
      sosRequest: {
        select: {
          id: true,
          title: true,
          company: { select: { ownerId: true } },
        },
      },
    },
  })
  if (!application) return NextResponse.json({ error: "존재하지 않는 신청입니다." }, { status: 404 })

  const isOwner = application.sosRequest.company.ownerId === session.user.id
  const isApplicant = application.applicantUserId === session.user.id
  const isAdmin = session.user.role === UserRole.ADMIN
  if (!isOwner && !isApplicant && !isAdmin) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 })
  }
  if (isApplicant && body.status !== "CANCELLED") {
    return NextResponse.json({ error: "신청자는 취소만 할 수 있습니다." }, { status: 403 })
  }
  if (!isAdmin && body.status === "REPORTED") {
    return NextResponse.json({ error: "신고 처리는 관리자만 할 수 있습니다." }, { status: 403 })
  }

  const now = new Date()
  const updated = await prisma.$transaction(async (tx) => {
    const data: Record<string, unknown> = {
      status: body.status,
      adminMemo: isAdmin && typeof body.adminMemo === "string" ? body.adminMemo.trim() || null : application.adminMemo,
    }
    if (body.status === "CONTACTED") data.contactedAt = now
    if (body.status === "SELECTED") data.selectedAt = now
    if (body.status === "REJECTED") data.rejectedAt = now
    if (body.status === "CANCELLED") data.cancelledAt = now
    if (body.status === "REPORTED") data.reportedAt = now

    const app = await tx.sosApplication.update({
      where: { id: applicationId },
      data,
      select: { id: true, status: true, applicantUserId: true },
    })
    await tx.auditLog.create({
      data: {
        actorUserId: session.user.id,
        action: "SOS_APPLICATION_STATUS_UPDATE",
        targetType: "SOS_APPLICATION",
        targetId: applicationId,
        metadata: { status: body.status },
      },
    })
    return app
  })

  const notificationUserId = isApplicant ? application.sosRequest.company.ownerId : application.applicantUserId
  await createNotifications([
    {
      userId: notificationUserId,
      sosRequestId: application.sosRequest.id,
      type: "SOS_APPLICATION_STATUS",
      title: "SOS 신청 상태가 변경되었습니다",
      body: `'${application.sosRequest.title}' 신청 상태가 ${updated.status}로 변경되었습니다.`,
    },
  ])

  return NextResponse.json({ application: updated })
}
