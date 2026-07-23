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

    // availability �??�이?�리?�트 검�?(T-04-03-02)
    const VALID = ["AVAILABLE", "UNAVAILABLE", "BUSY"] as const
    if (!VALID.includes(availability)) {
      return NextResponse.json({ error: "?�바�?가???�태�??�력??주세??" }, { status: 400 })
    }

    const profile = await prisma.workerProfile.findUnique({
      where: { userId: session.user.id },
    })
    if (!profile) {
      return NextResponse.json({ error: "?�로?�을 먼�? ?�록??주세??" }, { status: 404 })
    }

    // userId: session.user.id 고정?�로 ?�???�태 변�?방�? (T-04-03-01)
    const updated = await prisma.workerProfile.update({
      where: { userId: session.user.id },
      data: { availability },
    })

    // AVAILABLE ?�환 ??진행 중인 SOS �?조건 맞는 것에 ?�림 발송 (fire-and-forget)
    if (availability === "AVAILABLE") {
      void matchSosRequestsForWorker(profile.id, session.user.id)
    }

    return NextResponse.json({ availability: updated.availability })
  } catch (error) {
    console.error("[availability] Error:", error)
    return NextResponse.json({ error: ERROR_MESSAGES.SERVER }, { status: 500 })
  }
}
