export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { UserRole } from "@prisma/client"

const CONSENT_VERSION = "1.0.0"

const RegisterSchema = z.object({
  role: z.enum(["COMPANY_OWNER", "WORKER"] as const),
  consents: z.array(z.enum(["TERMS", "PRIVACY", "LOCATION"] as const)).length(3),
})

export async function POST(req: NextRequest) {
  const session = await getServerSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "?¸ì¦???„ìš”?©ë‹ˆ??" }, { status: 401 })
  }

  const body = await req.json()
  const parsed = RegisterSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "?˜ëª»???”ì²­?…ë‹ˆ??" }, { status: 400 })
  }

  const { role, consents } = parsed.data
  const userId = session.user.id
  const ipAddress =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    undefined

  // ?´ë? ??• ???¤ì •???¬ìš©???¬ë“±ë¡?ë°©ì?
  const existing = await prisma.user.findUnique({
    where: { id: userId, deletedAt: null },
    select: { role: true },
  })
  if (!existing) {
    return NextResponse.json({ error: "?¬ìš©?ë? ì°¾ì„ ???†ìŠµ?ˆë‹¤." }, { status: 404 })
  }
  // ADMIN ê³„ì •?€ ??API ë¡???•  ë³€ê²?ë¶ˆê?
  if (existing.role === "ADMIN") {
    return NextResponse.json({ error: "ê¶Œí•œ???†ìŠµ?ˆë‹¤." }, { status: 403 })
  }

  // ??•  ?¤ì • + ConsentLog 3ê±??€??(?¸ëžœ??…˜)
  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { role: role as UserRole },
    }),
    prisma.consentLog.createMany({
      data: consents.map((consentType) => ({
        userId,
        consentType,
        version: CONSENT_VERSION,
        ipAddress,
      })),
      skipDuplicates: true,
    }),
  ])

  return NextResponse.json({ success: true })
}
