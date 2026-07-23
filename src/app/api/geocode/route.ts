export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/session"

// GET /api/geocode?address=?占쎌슱 媛뺣궓占??占쏀뿤?占쏙옙?...
// OpenStreetMap Nominatim ?占쎌슜 (API ??遺덊븘?? ?占쎄뎅 二쇱냼 吏??
export async function GET(req: NextRequest) {
  const session = await getServerSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "濡쒓렇?占쎌씠 ?占쎌슂?占쎈땲??" }, { status: 401 })
  }

  const address = req.nextUrl.searchParams.get("address")
  if (!address?.trim()) {
    return NextResponse.json({ error: "address ?占쎈씪誘명꽣媛 ?占쎌슂?占쎈땲??" }, { status: 400 })
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
      next: { revalidate: 3600 }, // 1?占쎄컙 罹먯떆
    })

    if (!res.ok) {
      console.error("[geocode] Nominatim error:", res.status)
      return NextResponse.json({ error: "二쇱냼 蹂??占??占쎈쪟媛 諛쒖깮?占쎌뒿?占쎈떎." }, { status: 500 })
    }

    const data = await res.json() as { lat: string; lon: string; display_name: string }[]

    if (!data.length) {
      return NextResponse.json({ error: "?占쎈떦 二쇱냼占?李얠쓣 ???占쎌뒿?占쎈떎." }, { status: 422 })
    }

    const doc = data[0]
    return NextResponse.json({
      lat: parseFloat(doc.lat),
      lng: parseFloat(doc.lon),
      addressName: doc.display_name,
    })
  } catch (err) {
    console.error("[geocode] error:", err)
    return NextResponse.json({ error: "二쇱냼 蹂??占??占쎈쪟媛 諛쒖깮?占쎌뒿?占쎈떎." }, { status: 500 })
  }
}
