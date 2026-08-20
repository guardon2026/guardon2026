export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/session"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await getServerSession()
  if (!session?.user?.id) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 })
  if (session.user.role !== "COMPANY_OWNER") return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 })

  const company = await prisma.company.findUnique({
    where: { ownerId: session.user.id },
    select: {
      id: true,
      name: true,
      licenseNumber: true,
      businessRegistrationNumber: true,
      phone: true,
      address: true,
      city: true,
      district: true,
      description: true,
      status: true,
      approvedAt: true,
    },
  })
  if (!company) return NextResponse.json({ error: "등록된 업체가 없습니다." }, { status: 404 })

  return NextResponse.json({ company })
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession()
  if (!session?.user?.id) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 })
  if (session.user.role !== "COMPANY_OWNER") return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 })

  const company = await prisma.company.findUnique({ where: { ownerId: session.user.id }, select: { id: true } })
  if (!company) return NextResponse.json({ error: "등록된 업체가 없습니다." }, { status: 404 })

  let body: Record<string, unknown>
  try { body = await req.json() } catch {
    return NextResponse.json({ error: "잘못된 요청 형식입니다." }, { status: 400 })
  }

  const updateData: Record<string, unknown> = {}
  if (typeof body.name === "string" && body.name.trim()) updateData.name = body.name.trim()
  if (typeof body.phone === "string") updateData.phone = body.phone.trim()
  if (typeof body.address === "string") updateData.address = body.address.trim()
  if (typeof body.city === "string") updateData.city = body.city.trim()
  if (typeof body.district === "string") updateData.district = body.district.trim()
  if (typeof body.description === "string") updateData.description = body.description.trim() || null

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "변경할 내용이 없습니다." }, { status: 400 })
  }

  const updated = await prisma.company.update({
    where: { id: company.id },
    data: updateData,
    select: { id: true, name: true, phone: true, address: true, city: true, district: true, description: true },
  })

  return NextResponse.json({ company: updated })
}
