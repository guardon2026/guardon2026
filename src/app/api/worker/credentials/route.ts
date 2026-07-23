export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "@/lib/session"
import { ERROR_MESSAGES } from "@/lib/constants"
import { CredentialType } from "@prisma/client"

// GET: 본인 자격증 목록 조회
export async function GET() {
  try {
    const session = await getServerSession()
    if (!session?.user || session.user.role !== "WORKER") {
      return NextResponse.json({ error: ERROR_MESSAGES.UNAUTHORIZED }, { status: 401 })
    }

    const profile = await prisma.workerProfile.findUnique({
      where: { userId: session.user.id },
      include: {
        credentials: {
          orderBy: { createdAt: "asc" },
        },
      },
    })

    if (!profile) {
      return NextResponse.json({ credentials: [] })
    }

    return NextResponse.json({ credentials: profile.credentials })
  } catch (error) {
    console.error("[GET /api/worker/credentials] Error:", error)
    return NextResponse.json({ error: ERROR_MESSAGES.SERVER }, { status: 500 })
  }
}

// POST: 자격증 레코드 생성 (upsert — 재제출 시 심사 초기화)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user || session.user.role !== "WORKER") {
      return NextResponse.json({ error: ERROR_MESSAGES.UNAUTHORIZED }, { status: 401 })
    }

    const body = await req.json()
    const { credentialType, fileKey, issuedDate } = body

    // 필수 파라미터 검증
    if (!credentialType || !fileKey) {
      return NextResponse.json(
        { error: "자격증 종류와 파일이 필요합니다." },
        { status: 400 },
      )
    }

    // CredentialType enum 유효성 검증
    if (!Object.values(CredentialType).includes(credentialType as CredentialType)) {
      return NextResponse.json(
        { error: "올바르지 않은 자격증 종류입니다." },
        { status: 400 },
      )
    }

    // 본인 프로필에만 레코드 생성 (T-04-02-04)
    const profile = await prisma.workerProfile.findUnique({
      where: { userId: session.user.id },
    })

    if (!profile) {
      return NextResponse.json(
        { error: "프로필을 먼저 등록해 주세요." },
        { status: 404 },
      )
    }

    // @@unique([workerProfileId, type]) — upsert로 중복 방지
    // 재제출 시 status를 PENDING으로 초기화하여 재심사 처리
    const credential = await prisma.credential.upsert({
      where: {
        workerProfileId_type: {
          workerProfileId: profile.id,
          type: credentialType as CredentialType,
        },
      },
      create: {
        workerProfileId: profile.id,
        type: credentialType as CredentialType,
        documentUrl: fileKey,
        status: "PENDING",
        issuedDate: issuedDate ? new Date(issuedDate) : null,
      },
      update: {
        documentUrl: fileKey,
        status: "PENDING", // 재제출 시 심사 초기화
        issuedDate: issuedDate ? new Date(issuedDate) : null,
        rejectedAt: null,
        rejectionReason: null,
      },
    })

    return NextResponse.json({ credential }, { status: 201 })
  } catch (error) {
    console.error("[POST /api/worker/credentials] Error:", error)
    return NextResponse.json({ error: ERROR_MESSAGES.SERVER }, { status: 500 })
  }
}
