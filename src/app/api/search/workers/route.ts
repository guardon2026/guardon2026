export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { AvailabilityStatus, CredentialStatus } from "@prisma/client"

// PostgreSQL raw ì¿¼ë¦¬?ì„œ ë°°ì—´??ë¬¸ì?´ë¡œ ?????ˆì–´ ?•ê·œ??
function toArray(value: unknown): string[] {
  if (Array.isArray(value)) return value as string[]
  if (typeof value === "string") {
    return value.replace(/^{|}$/g, "").split(",").filter(Boolean)
  }
  return []
}

// GET /api/search/workers
// ì¿¼ë¦¬ ?Œë¼ë¯¸í„°: lat, lng, radiusKm(default 20), workField, credentialType,
//               availability(default AVAILABLE), minExperience(default 0)
export async function GET(req: NextRequest) {
  const session = await getServerSession()

  // COMPANY_OWNER ê¶Œí•œ ?„ìš”
  if (!session?.user || session.user.role !== "COMPANY_OWNER") {
    return NextResponse.json(
      { error: "?‘ê·¼ ê¶Œí•œ???†ìŠµ?ˆë‹¤. ?…ì²´ ?€?œë§Œ ?¸ë ¥ ê²€?‰ì´ ê°€?¥í•©?ˆë‹¤." },
      { status: 401 }
    )
  }

  const { searchParams } = req.nextUrl

  const latParam = searchParams.get("lat")
  const lngParam = searchParams.get("lng")
  const radiusKmParam = searchParams.get("radiusKm")
  const workField = searchParams.get("workField") ?? ""
  const credentialType = searchParams.get("credentialType") ?? ""
  const availabilityParam = searchParams.get("availability") ?? "AVAILABLE"
  const minExperienceParam = searchParams.get("minExperience") ?? "0"

  // ?„ë„Â·ê²½ë„ ?„ìˆ˜ ê²€ì¦?
  if (!latParam || !lngParam) {
    return NextResponse.json(
      { error: "?„ë„(lat)?€ ê²½ë„(lng)???„ìˆ˜ ?Œë¼ë¯¸í„°?…ë‹ˆ??" },
      { status: 400 }
    )
  }

  const lat = parseFloat(latParam)
  const lng = parseFloat(lngParam)
  const radiusKm = radiusKmParam ? parseFloat(radiusKmParam) : 20
  const minExperience = parseInt(minExperienceParam, 10) || 0
  const availability = availabilityParam as AvailabilityStatus

  // ?«ì ê²€ì¦?
  if (isNaN(lat) || isNaN(lng) || isNaN(radiusKm)) {
    return NextResponse.json(
      { error: "?„ë„, ê²½ë„, ë°˜ê²½ ê°’ì´ ?¬ë°”ë¥´ì? ?ŠìŠµ?ˆë‹¤." },
      { status: 400 }
    )
  }

  // ? íš¨??AvailabilityStatus ê²€ì¦?
  const validAvailability: AvailabilityStatus[] = ["AVAILABLE", "UNAVAILABLE", "BUSY"]
  if (!validAvailability.includes(availability)) {
    return NextResponse.json(
      { error: "ê°€???íƒœ ê°’ì´ ?¬ë°”ë¥´ì? ?ŠìŠµ?ˆë‹¤." },
      { status: 400 }
    )
  }

  try {
    // PostGIS $queryRaw ??tagged template literal ?„ìˆ˜ (T-01-02-01)
    type RawWorkerRow = {
      id: string
      userId: string
      workFields: string[]
      experienceYears: number
      desiredHourlyRate: number | null
      averageRating: number
      availability: string
      city: string
      district: string
      name: string
      distance_m: number
    }

    // location???ˆëŠ” ?¸ë ¥?€ PostGIS ë°˜ê²½ ê²€?? NULL???¸ë ¥?€ city/district ?ìŠ¤?¸ë¡œ ?¬í•¨
    const rawResults = await prisma.$queryRaw<RawWorkerRow[]>`
      SELECT
        wp.id,
        wp."userId",
        wp."workFields",
        wp."experienceYears",
        wp."desiredHourlyRate",
        wp."averageRating",
        wp.availability,
        wp.city,
        wp.district,
        u.name,
        CASE
          WHEN wp.location IS NOT NULL THEN
            ST_Distance(
              wp.location,
              ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography
            )
          ELSE 999999
        END as distance_m
      FROM worker_profiles wp
      JOIN users u ON u.id = wp."userId" AND u."deletedAt" IS NULL
      WHERE (
        (
          wp.location IS NOT NULL
          AND ST_DWithin(
            wp.location,
            ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
            ${radiusKm * 1000}
          )
        )
        OR wp.location IS NULL
      )
        AND wp.availability = ${availability}::text::"AvailabilityStatus"
        AND wp."isProfilePublic" = true
        AND wp."experienceYears" >= ${minExperience}
      ORDER BY distance_m ASC
      LIMIT 50
    `

    // workField ?„í„° (Prisma ?ˆë²¨)
    let filtered = rawResults
    if (workField) {
      filtered = filtered.filter((w) =>
        w.workFields.includes(workField)
      )
    }

    if (filtered.length === 0) {
      return NextResponse.json({ workers: [] })
    }

    // workerProfile ID ëª©ë¡
    const workerProfileIds = filtered.map((w) => w.id)

    // ?ê²©ì¦?ì¡°íšŒ (APPROVED ?íƒœë§?
    const credentials = await prisma.credential.findMany({
      where: {
        workerProfileId: { in: workerProfileIds },
        status: CredentialStatus.APPROVED,
      },
      select: {
        workerProfileId: true,
        type: true,
        status: true,
      },
    })

    // credentialType ?„í„° (?”ì²­???ê²©ì¦?ë³´ìœ ?ë§Œ)
    let finalFiltered = filtered
    if (credentialType) {
      const workerProfilesWithCredential = new Set(
        credentials
          .filter((c) => c.type === credentialType)
          .map((c) => c.workerProfileId)
      )
      finalFiltered = filtered.filter((w) =>
        workerProfilesWithCredential.has(w.id)
      )
    }

    // ?ê²©ì¦?ë§?êµ¬ì„±
    const credentialMap: Record<string, typeof credentials> = {}
    for (const cred of credentials) {
      if (!credentialMap[cred.workerProfileId]) {
        credentialMap[cred.workerProfileId] = []
      }
      credentialMap[cred.workerProfileId].push(cred)
    }

    // ?‘ë‹µ ?°ì´??ì¡°í•©
    const workers = finalFiltered.map((w) => ({
      id: w.id,
      userId: w.userId,
      name: w.name,
      workFields: toArray(w.workFields),
      experienceYears: w.experienceYears,
      desiredHourlyRate: w.desiredHourlyRate,
      averageRating: w.averageRating,
      availability: w.availability,
      city: w.city,
      district: w.district,
      distanceM: Math.round(w.distance_m),
      credentials: credentialMap[w.id] ?? [],
    }))

    return NextResponse.json({ workers })
  } catch (error) {
    console.error("[GET /api/search/workers] error:", error)
    return NextResponse.json(
      { error: "?¸ë ¥ ê²€??ì¤??¤ë¥˜ê°€ ë°œìƒ?ˆìŠµ?ˆë‹¤. ? ì‹œ ???¤ì‹œ ?œë„??ì£¼ì„¸??" },
      { status: 500 }
    )
  }
}
