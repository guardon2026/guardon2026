export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/session"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await getServerSession()
  if (!session?.user?.id) return NextResponse.json({ error: "?¸ì¦???„ìš”?©ë‹ˆ??" }, { status: 401 })
  if (session.user.role !== "COMPANY_OWNER") return NextResponse.json({ error: "ê¶Œí•œ???†ìŠµ?ˆë‹¤." }, { status: 403 })

  const company = await prisma.company.findUnique({
    where: { ownerId: session.user.id },
    select: {
      id: true,
      name: true,
      phone: true,
      description: true,
      kakaoOpenChatUrl: true,
    },
  })
  if (!company) return NextResponse.json({ error: "?±ë¡???…ì²´ê°€ ?†ìŠµ?ˆë‹¤." }, { status: 404 })

  return NextResponse.json({ company })
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession()
  if (!session?.user?.id) return NextResponse.json({ error: "?¸ì¦???„ìš”?©ë‹ˆ??" }, { status: 401 })
  if (session.user.role !== "COMPANY_OWNER") return NextResponse.json({ error: "ê¶Œí•œ???†ìŠµ?ˆë‹¤." }, { status: 403 })

  const company = await prisma.company.findUnique({ where: { ownerId: session.user.id }, select: { id: true } })
  if (!company) return NextResponse.json({ error: "?±ë¡???…ì²´ê°€ ?†ìŠµ?ˆë‹¤." }, { status: 404 })

  let body: Record<string, unknown>
  try { body = await req.json() } catch {
    return NextResponse.json({ error: "?˜ëª»???”ì²­ ?•ì‹?…ë‹ˆ??" }, { status: 400 })
  }

  const updateData: Record<string, unknown> = {}
  if (typeof body.phone === "string") updateData.phone = body.phone.trim()
  if (typeof body.description === "string") updateData.description = body.description.trim() || null
  if ("kakaoOpenChatUrl" in body) {
    const url = body.kakaoOpenChatUrl
    if (url === null || url === "") {
      updateData.kakaoOpenChatUrl = null
    } else if (typeof url === "string") {
      if (!url.startsWith("https://open.kakao.com/")) {
        return NextResponse.json({ error: "?¬ë°”ë¥?ì¹´ì¹´???¤í”ˆì±„íŒ… ë§í¬ë¥??…ë ¥??ì£¼ì„¸?? (https://open.kakao.com/...)" }, { status: 400 })
      }
      updateData.kakaoOpenChatUrl = url.trim()
    }
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "ë³€ê²½í•  ?´ìš©???†ìŠµ?ˆë‹¤." }, { status: 400 })
  }

  const updated = await prisma.company.update({
    where: { id: company.id },
    data: updateData,
    select: { id: true, phone: true, description: true, kakaoOpenChatUrl: true },
  })

  return NextResponse.json({ company: updated })
}
