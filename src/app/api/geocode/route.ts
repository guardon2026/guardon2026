export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/session"

// GET /api/geocode?address=서울 강남구 테헤란로 ...
// OpenStreetMap Nominatim 사용 (API 키 불필요, 한국 주소 지원)
export async function GET(req: NextRequest) {
  const session = await getServerSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 })
  }

  const address = req.nextUrl.searchParams.get("address")
  if (!address?.trim()) {
    return NextResponse.json({ error: "address 파라미터가 필요합니다." }, { status: 400 })
  }

  const query = address.trim()

  try {
    const url = new URL("https://nominatim.openstreetmap.org/search")
    url.searchParams.set("q", query)
    url.searchParams.set("format", "json")
    url.searchParams.set("limit", "1")
    url.searchParams.set("countrycodes", "kr")
    url.searchParams.set("accept-language", "ko")

    const res = await fetch(url.toString(), {
      headers: { "User-Agent": "guardon-app/1.0 (https://guardon.kr)" },
      next: { revalidate: 3600 }, // 1시간 캐시
    })

    if (!res.ok) {
      console.error("[geocode] Nominatim error:", res.status)
      return NextResponse.json({ error: "주소 변환 중 오류가 발생했습니다." }, { status: 500 })
    }

    const data = await res.json() as { lat: string; lon: string; display_name: string }[]

    if (!data.length) {
      return NextResponse.json({ error: "해당 주소를 찾을 수 없습니다." }, { status: 422 })
    }

    const doc = data[0]
    return NextResponse.json({
      lat: parseFloat(doc.lat),
      lng: parseFloat(doc.lon),
      addressName: doc.display_name,
    })
  } catch (err) {
    console.error("[geocode] error:", err)
    return NextResponse.json({ error: "주소 변환 중 오류가 발생했습니다." }, { status: 500 })
  }
}
