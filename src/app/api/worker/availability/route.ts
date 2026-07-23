export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { ERROR_MESSAGES } from "@/lib/constants"
import { matchSosRequestsForWorker } from "@/lib/sos-matcher"

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user || session.user.role !== "WORKER") {
      return NextResponse.json({ error: ERROR_MESSAGES.UNAUTHORIZED }, { status: 401 })
    }

    const body = await req.json()
    const { availability } = body

    // availability ê°??”ì´?¸ë¦¬?¤íŠ¸ ê²€ì¦?(T-04-03-02)
    const VALID = ["AVAILABLE", "UNAVAILABLE", "BUSY"] as const
    if (!VALID.includes(availability)) {
      return NextResponse.json({ error: "?¬ë°”ë¥?ê°€???íƒœë¥??…ë ¥??ì£¼ì„¸??" }, { status: 400 })
    }

    const profile = await prisma.workerProfile.findUnique({
      where: { userId: session.user.id },
    })
    if (!profile) {
      return NextResponse.json({ error: "?„ë¡œ?„ì„ ë¨¼ì? ?±ë¡??ì£¼ì„¸??" }, { status: 404 })
    }

    // userId: session.user.id ê³ ì •?¼ë¡œ ?€???íƒœ ë³€ê²?ë°©ì? (T-04-03-01)
    const updated = await prisma.workerProfile.update({
      where: { userId: session.user.id },
      data: { availability },
    })

    // AVAILABLE ?„í™˜ ??ì§„í–‰ ì¤‘ì¸ SOS ì¤?ì¡°ê±´ ë§ëŠ” ê²ƒì— ?Œë¦¼ ë°œì†¡ (fire-and-forget)
    if (availability === "AVAILABLE") {
      void matchSosRequestsForWorker(profile.id, session.user.id)
    }

    return NextResponse.json({ availability: updated.availability })
  } catch (error) {
    console.error("[availability] Error:", error)
    return NextResponse.json({ error: ERROR_MESSAGES.SERVER }, { status: 500 })
  }
}
