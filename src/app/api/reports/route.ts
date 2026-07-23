export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "@/lib/session"

const VALID_TARGETS = new Set(["SOS_REQUEST", "SOS_APPLICATION", "COMPANY", "WORKER", "USER"])

export async function POST(req: NextRequest) {
  const session = await getServerSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Î°úÍ∑∏?∏Ïù¥ ?ÑÏöî?©Îãà??" }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "?òÎ™ª???îÏ≤≠ ?ïÏãù?ÖÎãà??" }, { status: 400 })
  }

  const targetType = typeof body.targetType === "string" ? body.targetType.trim() : ""
  const targetId = typeof body.targetId === "string" ? body.targetId.trim() : ""
  const reason = typeof body.reason === "string" ? body.reason.trim() : ""
  const description = typeof body.description === "string" ? body.description.trim() : ""

  if (!VALID_TARGETS.has(targetType) || !targetId || !reason) {
    return NextResponse.json({ error: "?†Í≥† ?Ä?ÅÍ≥º ?¨Ïú†Î•??ÖÎ†•??Ï£ºÏÑ∏??" }, { status: 400 })
  }

  const report = await prisma.report.create({
    data: {
      reporterUserId: session.user.id,
      targetType,
      targetId,
      reason: reason.slice(0, 120),
      description: description ? description.slice(0, 2000) : null,
    },
    select: { id: true, status: true },
  })

  await prisma.auditLog.create({
    data: {
      actorUserId: session.user.id,
      action: "REPORT_CREATE",
      targetType,
      targetId,
      metadata: { reason: reason.slice(0, 120) },
    },
  })

  return NextResponse.json({ report }, { status: 201 })
}
