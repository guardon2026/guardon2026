export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/session"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await getServerSession()
  if (!session?.user?.id) return NextResponse.json({ error: "?�증???�요?�니??" }, { status: 401 })
  if (session.user.role !== "COMPANY_OWNER") return NextResponse.json({ error: "권한???�습?�다." }, { status: 403 })

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
  if (!company) return NextResponse.json({ error: "?�록???�체가 ?�습?�다." }, { status: 404 })

  return NextResponse.json({ company })
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession()
  if (!session?.user?.id) return NextResponse.json({ error: "?�증???�요?�니??" }, { status: 401 })
  if (session.user.role !== "COMPANY_OWNER") return NextResponse.json({ error: "권한???�습?�다." }, { status: 403 })

  const company = await prisma.company.findUnique({ where: { ownerId: session.user.id }, select: { id: true } })
  if (!company) return NextResponse.json({ error: "?�록???�체가 ?�습?�다." }, { status: 404 })

  let body: Record<string, unknown>
  try { body = await req.json() } catch {
    return NextResponse.json({ error: "?�못???�청 ?�식?�니??" }, { status: 400 })
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
        return NextResponse.json({ error: "?�바�?카카???�픈채팅 링크�??�력??주세?? (https://open.kakao.com/...)" }, { status: 400 })
      }
      updateData.kakaoOpenChatUrl = url.trim()
    }
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "변경할 ?�용???�습?�다." }, { status: 400 })
  }

  const updated = await prisma.company.update({
    where: { id: company.id },
    data: updateData,
    select: { id: true, phone: true, description: true, kakaoOpenChatUrl: true },
  })

  return NextResponse.json({ company: updated })
}
