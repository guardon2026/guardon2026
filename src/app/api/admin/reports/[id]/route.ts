import { NextRequest, NextResponse } from "next/server"
import { ReportStatus } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "@/lib/session"

const STATUSES: ReportStatus[] = ["OPEN", "REVIEWING", "RESOLVED", "DISMISSED"]

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const session = await getServerSession()
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "관리자 권한이 필요합니다." }, { status: 403 })
  }

  let body: { status?: ReportStatus; adminMemo?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "잘못된 요청 형식입니다." }, { status: 400 })
  }

  if (!body.status || !STATUSES.includes(body.status)) {
    return NextResponse.json({ error: "올바르지 않은 신고 상태입니다." }, { status: 400 })
  }

  const report = await prisma.report.update({
    where: { id },
    data: {
      status: body.status,
      adminMemo: typeof body.adminMemo === "string" ? body.adminMemo.trim() || null : undefined,
      resolvedAt: ["RESOLVED", "DISMISSED"].includes(body.status) ? new Date() : null,
    },
    select: { id: true, status: true },
  })

  await prisma.auditLog.create({
    data: {
      actorUserId: session.user.id,
      action: "REPORT_STATUS_UPDATE",
      targetType: "REPORT",
      targetId: id,
      metadata: { status: body.status },
    },
  })

  return NextResponse.json({ report })
}
