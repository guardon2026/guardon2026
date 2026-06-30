import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { ERROR_MESSAGES } from "@/lib/constants"

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user || session.user.role !== "WORKER") {
      return NextResponse.json({ error: ERROR_MESSAGES.UNAUTHORIZED }, { status: 401 })
    }

    const body = await req.json()
    const { availability } = body

    // availability 값 화이트리스트 검증 (T-04-03-02)
    const VALID = ["AVAILABLE", "UNAVAILABLE", "BUSY"] as const
    if (!VALID.includes(availability)) {
      return NextResponse.json({ error: "올바른 가용 상태를 입력해 주세요." }, { status: 400 })
    }

    const profile = await prisma.workerProfile.findUnique({
      where: { userId: session.user.id },
    })
    if (!profile) {
      return NextResponse.json({ error: "프로필을 먼저 등록해 주세요." }, { status: 404 })
    }

    // userId: session.user.id 고정으로 타인 상태 변경 방지 (T-04-03-01)
    const updated = await prisma.workerProfile.update({
      where: { userId: session.user.id },
      data: { availability },
    })

    return NextResponse.json({ availability: updated.availability })
  } catch (error) {
    console.error("[availability] Error:", error)
    return NextResponse.json({ error: ERROR_MESSAGES.SERVER }, { status: 500 })
  }
}
