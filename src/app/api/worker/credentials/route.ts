export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "@/lib/session"
import { ERROR_MESSAGES } from "@/lib/constants"
import { CredentialType } from "@prisma/client"

// GET: ë³¸ì¸ ?ê²©ì¦?ëª©ë¡ ì¡°íšŒ
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

// POST: ?ê²©ì¦??ˆì½”???ì„± (upsert ???¬ì œì¶????¬ì‚¬ ì´ˆê¸°??
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user || session.user.role !== "WORKER") {
      return NextResponse.json({ error: ERROR_MESSAGES.UNAUTHORIZED }, { status: 401 })
    }

    const body = await req.json()
    const { credentialType, fileKey, issuedDate } = body

    // ?„ìˆ˜ ?Œë¼ë¯¸í„° ê²€ì¦?    if (!credentialType || !fileKey) {
      return NextResponse.json(
        { error: "?ê²©ì¦?ì¢…ë¥˜?€ ?Œì¼???„ìš”?©ë‹ˆ??" },
        { status: 400 },
      )
    }

    // CredentialType enum ? íš¨??ê²€ì¦?    if (!Object.values(CredentialType).includes(credentialType as CredentialType)) {
      return NextResponse.json(
        { error: "?¬ë°”ë¥´ì? ?Šì? ?ê²©ì¦?ì¢…ë¥˜?…ë‹ˆ??" },
        { status: 400 },
      )
    }

    // ë³¸ì¸ ?„ë¡œ?„ì—ë§??ˆì½”???ì„± (T-04-02-04)
    const profile = await prisma.workerProfile.findUnique({
      where: { userId: session.user.id },
    })

    if (!profile) {
      return NextResponse.json(
        { error: "?„ë¡œ?„ì„ ë¨¼ì? ?±ë¡??ì£¼ì„¸??" },
        { status: 404 },
      )
    }

    // @@unique([workerProfileId, type]) ??upsertë¡?ì¤‘ë³µ ë°©ì?
    // ?¬ì œì¶???statusë¥?PENDING?¼ë¡œ ì´ˆê¸°?”í•˜???¬ì‹¬??ì²˜ë¦¬
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
        status: "PENDING", // ?¬ì œì¶????¬ì‚¬ ì´ˆê¸°??        issuedDate: issuedDate ? new Date(issuedDate) : null,
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
