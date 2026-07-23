export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/session"

// GET /api/geocode?address=?œìš¸ ê°•ë‚¨êµ??Œí—¤?€ë¡?...
// OpenStreetMap Nominatim ?¬ìš© (API ??ë¶ˆí•„?? ?œêµ­ ì£¼ì†Œ ì§€??
export async function GET(req: NextRequest) {
  const session = await getServerSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "ë¡œê·¸?¸ì´ ?„ìš”?©ë‹ˆ??" }, { status: 401 })
  }

  const address = req.nextUrl.searchParams.get("address")
  if (!address?.trim()) {
    return NextResponse.json({ error: "address ?Œë¼ë¯¸í„°ê°€ ?„ìš”?©ë‹ˆ??" }, { status: 400 })
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
      next: { revalidate: 3600 }, // 1?œê°„ ìºì‹œ
    })

    if (!res.ok) {
      console.error("[geocode] Nominatim error:", res.status)
      return NextResponse.json({ error: "ì£¼ì†Œ ë³€??ì¤??¤ë¥˜ê°€ ë°œìƒ?ˆìŠµ?ˆë‹¤." }, { status: 500 })
    }

    const data = await res.json() as { lat: string; lon: string; display_name: string }[]

    if (!data.length) {
      return NextResponse.json({ error: "?´ë‹¹ ì£¼ì†Œë¥?ì°¾ì„ ???†ìŠµ?ˆë‹¤." }, { status: 422 })
    }

    const doc = data[0]
    return NextResponse.json({
      lat: parseFloat(doc.lat),
      lng: parseFloat(doc.lon),
      addressName: doc.display_name,
    })
  } catch (err) {
    console.error("[geocode] error:", err)
    return NextResponse.json({ error: "ì£¼ì†Œ ë³€??ì¤??¤ë¥˜ê°€ ë°œìƒ?ˆìŠµ?ˆë‹¤." }, { status: 500 })
  }
}
