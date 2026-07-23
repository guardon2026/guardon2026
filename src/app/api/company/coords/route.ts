export const dynamic = 'force-dynamic'
import { NextResponse } from "next/server"
import { getServerSession } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { UserRole } from "@prisma/client"

// GET /api/company/coords ???�체 ?�록 주소�?지?�코?�해 좌표 반환
export async function GET() {
  const session = await getServerSession()
  if (!session?.user?.id || session.user.role !== UserRole.COMPANY_OWNER) {
    return NextResponse.json({ error: "권한 ?�음" }, { status: 401 })
  }

  const company = await prisma.company.findUnique({
    where: { ownerId: session.user.id },
    select: { address: true, city: true, district: true },
  })
  if (!company) return NextResponse.json({ error: "?�체 ?�음" }, { status: 404 })

  const query = company.address || `${company.city} ${company.district}`

  try {
    const url = new URL("https://nominatim.openstreetmap.org/search")
    url.searchParams.set("q", query)
    url.searchParams.set("format", "json")
    url.searchParams.set("limit", "1")
    url.searchParams.set("countrycodes", "kr")
    url.searchParams.set("accept-language", "ko")

    const res = await fetch(url.toString(), {
      headers: { "User-Agent": "guardon-app/1.0 (https://guardon.kr)" },
    })

    if (!res.ok) return NextResponse.json({ error: "주소 변???�패" }, { status: 500 })

    const data = await res.json() as { lat: string; lon: string }[]
    const doc = data[0]
    if (!doc) return NextResponse.json({ error: "주소�?찾을 ???�습?�다." }, { status: 422 })

    return NextResponse.json({ lat: parseFloat(doc.lat), lng: parseFloat(doc.lon) })
  } catch {
    return NextResponse.json({ error: "지?�코???�류" }, { status: 500 })
  }
}
