export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { AvailabilityStatus, CredentialStatus } from "@prisma/client"

// PostgreSQL raw 쿼리?�서 배열??문자?�로 ?????�어 ?�규??
function toArray(value: unknown): string[] {
  if (Array.isArray(value)) return value as string[]
  if (typeof value === "string") {
    return value.replace(/^{|}$/g, "").split(",").filter(Boolean)
  }
  return []
}

// GET /api/search/workers
// 쿼리 ?�라미터: lat, lng, radiusKm(default 20), workField, credentialType,
//               availability(default AVAILABLE), minExperience(default 0)
export async function GET(req: NextRequest) {
  const session = await getServerSession()

  // COMPANY_OWNER 권한 ?�요
  if (!session?.user || session.user.role !== "COMPANY_OWNER") {
    return NextResponse.json(
      { error: "?�근 권한???�습?�다. ?�체 ?�?�만 ?�력 검?�이 가?�합?�다." },
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

  // ?�도·경도 ?�수 검�?
  if (!latParam || !lngParam) {
    return NextResponse.json(
      { error: "?�도(lat)?� 경도(lng)???�수 ?�라미터?�니??" },
      { status: 400 }
    )
  }

  const lat = parseFloat(latParam)
  const lng = parseFloat(lngParam)
  const radiusKm = radiusKmParam ? parseFloat(radiusKmParam) : 20
  const minExperience = parseInt(minExperienceParam, 10) || 0
  const availability = availabilityParam as AvailabilityStatus

  // ?�자 검�?
  if (isNaN(lat) || isNaN(lng) || isNaN(radiusKm)) {
    return NextResponse.json(
      { error: "?�도, 경도, 반경 값이 ?�바르�? ?�습?�다." },
      { status: 400 }
    )
  }

  // ?�효??AvailabilityStatus 검�?
  const validAvailability: AvailabilityStatus[] = ["AVAILABLE", "UNAVAILABLE", "BUSY"]
  if (!validAvailability.includes(availability)) {
    return NextResponse.json(
      { error: "가???�태 값이 ?�바르�? ?�습?�다." },
      { status: 400 }
    )
  }

  try {
    // PostGIS $queryRaw ??tagged template literal ?�수 (T-01-02-01)
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

    // location???�는 ?�력?� PostGIS 반경 검?? NULL???�력?� city/district ?�스?�로 ?�함
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

    // workField ?�터 (Prisma ?�벨)
    let filtered = rawResults
    if (workField) {
      filtered = filtered.filter((w) =>
        w.workFields.includes(workField)
      )
    }

    if (filtered.length === 0) {
      return NextResponse.json({ workers: [] })
    }

    // workerProfile ID 목록
    const workerProfileIds = filtered.map((w) => w.id)

    // ?�격�?조회 (APPROVED ?�태�?
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

    // credentialType ?�터 (?�청???�격�?보유?�만)
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

    // ?�격�?�?구성
    const credentialMap: Record<string, typeof credentials> = {}
    for (const cred of credentials) {
      if (!credentialMap[cred.workerProfileId]) {
        credentialMap[cred.workerProfileId] = []
      }
      credentialMap[cred.workerProfileId].push(cred)
    }

    // ?�답 ?�이??조합
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
      { error: "?�력 검??�??�류가 발생?�습?�다. ?�시 ???�시 ?�도??주세??" },
      { status: 500 }
    )
  }
}
