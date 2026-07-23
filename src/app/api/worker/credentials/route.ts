export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "@/lib/session"
import { ERROR_MESSAGES } from "@/lib/constants"
import { CredentialType } from "@prisma/client"

// GET: 본인 ?�격�?목록 조회
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

// POST: ?�격�??�코???�성 (upsert ???�제�????�사 초기??
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user || session.user.role !== "WORKER") {
      return NextResponse.json({ error: ERROR_MESSAGES.UNAUTHORIZED }, { status: 401 })
    }

    const body = await req.json()
    const { credentialType, fileKey, issuedDate } = body

    // ?�수 ?�라미터 검�?    if (!credentialType || !fileKey) {
      return NextResponse.json(
        { error: "?�격�?종류?� ?�일???�요?�니??" },
        { status: 400 },
      )
    }

    // CredentialType enum ?�효??검�?    if (!Object.values(CredentialType).includes(credentialType as CredentialType)) {
      return NextResponse.json(
        { error: "?�바르�? ?��? ?�격�?종류?�니??" },
        { status: 400 },
      )
    }

    // 본인 ?�로?�에�??�코???�성 (T-04-02-04)
    const profile = await prisma.workerProfile.findUnique({
      where: { userId: session.user.id },
    })

    if (!profile) {
      return NextResponse.json(
        { error: "?�로?�을 먼�? ?�록??주세??" },
        { status: 404 },
      )
    }

    // @@unique([workerProfileId, type]) ??upsert�?중복 방�?
    // ?�제�???status�?PENDING?�로 초기?�하???�심??처리
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
        status: "PENDING", // ?�제�????�사 초기??        issuedDate: issuedDate ? new Date(issuedDate) : null,
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
