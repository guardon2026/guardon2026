import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { AvailabilityStatus, CredentialStatus } from "@prisma/client"

// GET /api/search/workers
// 쿼리 파라미터: lat, lng, radiusKm(default 20), workField, credentialType,
//               availability(default AVAILABLE), minExperience(default 0)
export async function GET(req: NextRequest) {
  const session = await getServerSession()

  // COMPANY_OWNER 권한 필요
  if (!session?.user || session.user.role !== "COMPANY_OWNER") {
    return NextResponse.json(
      { error: "접근 권한이 없습니다. 업체 대표만 인력 검색이 가능합니다." },
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

  // 위도·경도 필수 검증
  if (!latParam || !lngParam) {
    return NextResponse.json(
      { error: "위도(lat)와 경도(lng)는 필수 파라미터입니다." },
      { status: 400 }
    )
  }

  const lat = parseFloat(latParam)
  const lng = parseFloat(lngParam)
  const radiusKm = radiusKmParam ? parseFloat(radiusKmParam) : 20
  const minExperience = parseInt(minExperienceParam, 10) || 0
  const availability = availabilityParam as AvailabilityStatus

  // 숫자 검증
  if (isNaN(lat) || isNaN(lng) || isNaN(radiusKm)) {
    return NextResponse.json(
      { error: "위도, 경도, 반경 값이 올바르지 않습니다." },
      { status: 400 }
    )
  }

  // 유효한 AvailabilityStatus 검증
  const validAvailability: AvailabilityStatus[] = ["AVAILABLE", "UNAVAILABLE", "BUSY"]
  if (!validAvailability.includes(availability)) {
    return NextResponse.json(
      { error: "가용 상태 값이 올바르지 않습니다." },
      { status: 400 }
    )
  }

  try {
    // PostGIS $queryRaw — tagged template literal 필수 (T-01-02-01)
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
        ST_Distance(
          wp.location,
          ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography
        ) as distance_m
      FROM worker_profiles wp
      JOIN users u ON u.id = wp."userId" AND u."deletedAt" IS NULL
      WHERE ST_DWithin(
          wp.location,
          ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
          ${radiusKm * 1000}
        )
        AND wp.availability = ${availability}::text::"AvailabilityStatus"
        AND wp."isProfilePublic" = true
        AND wp."experienceYears" >= ${minExperience}
      ORDER BY distance_m ASC
      LIMIT 50
    `

    // workField 필터 (Prisma 레벨)
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

    // 자격증 조회 (APPROVED 상태만)
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

    // credentialType 필터 (요청한 자격증 보유자만)
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

    // 자격증 맵 구성
    const credentialMap: Record<string, typeof credentials> = {}
    for (const cred of credentials) {
      if (!credentialMap[cred.workerProfileId]) {
        credentialMap[cred.workerProfileId] = []
      }
      credentialMap[cred.workerProfileId].push(cred)
    }

    // 응답 데이터 조합
    const workers = finalFiltered.map((w) => ({
      id: w.id,
      userId: w.userId,
      name: w.name,
      workFields: w.workFields,
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
      { error: "인력 검색 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요." },
      { status: 500 }
    )
  }
}
