import { prisma } from "@/lib/prisma"
import { AvailabilityStatus, CredentialStatus } from "@prisma/client"

/**
 * SOS 요청에 매칭 가능한 경비 인력 목록을 반환한다.
 *
 * 매칭 조건:
 * 1. 가용 상태(AVAILABLE)
 * 2. SOS 요청의 requiredFields와 workFields가 하나 이상 겹침
 * 3. SOS 요청의 requiredCredentials가 있을 경우 해당 자격증을 APPROVED 상태로 보유
 * 4. SOS 요청의 집결지 위치 기준 radiusKm 이내 (PostGIS ST_DWithin)
 *
 * @param sosRequestId - 매칭할 SOS 요청 ID
 * @returns 매칭된 인력 배열 { workerProfileId, userId }
 */
export async function matchWorkers(
  sosRequestId: string
): Promise<Array<{ workerProfileId: string; userId: string }>> {
  // SOS 요청 조회
  const sosRequest = await prisma.sosRequest.findUnique({
    where: { id: sosRequestId },
    select: {
      id: true,
      latitude: true,
      longitude: true,
      radiusKm: true,
      requiredFields: true,
      requiredCredentials: true,
    },
  })

  if (!sosRequest) return []

  // 이미 알림이 발송된 워커 ID 목록 (중복 발송 방지)
  const existingMatches = await prisma.sosMatch.findMany({
    where: { sosRequestId },
    select: { workerProfileId: true },
  })
  const alreadyNotifiedIds = existingMatches.map((m) => m.workerProfileId)

  // 가용 상태이며 workFields가 하나라도 겹치는 워커 후보군 조회
  const candidateProfiles = await prisma.workerProfile.findMany({
    where: {
      availability: AvailabilityStatus.AVAILABLE,
      isProfilePublic: true,
      // workFields overlap (최소 1개 이상 공통)
      workFields: {
        hasSome: sosRequest.requiredFields,
      },
      // 이미 매칭된 워커 제외
      ...(alreadyNotifiedIds.length > 0
        ? { id: { notIn: alreadyNotifiedIds } }
        : {}),
      // 소프트딜리트 사용자 제외
      user: {
        deletedAt: null,
      },
    },
    select: {
      id: true,
      userId: true,
      latitude: true,
      longitude: true,
      credentials: {
        where: { status: CredentialStatus.APPROVED },
        select: { type: true },
      },
    },
  })

  if (candidateProfiles.length === 0) return []

  // 자격증 필터 (필요 자격증이 있으면 모두 보유해야 함)
  const requiredCreds = sosRequest.requiredCredentials
  const credFiltered =
    requiredCreds.length === 0
      ? candidateProfiles
      : candidateProfiles.filter((p) => {
          const approvedTypes = new Set(p.credentials.map((c) => c.type))
          return requiredCreds.every((rc) => approvedTypes.has(rc))
        })

  if (credFiltered.length === 0) return []

  // PostGIS 반경 필터 (ST_DWithin) — SOS 위치가 있을 때만 적용
  if (sosRequest.latitude != null && sosRequest.longitude != null) {
    const radiusMeters = sosRequest.radiusKm * 1000
    const lat = sosRequest.latitude
    const lon = sosRequest.longitude
    const candidateIds = credFiltered.map((p) => p.id)

    // tagged template literal 필수 (T-01-02-01)
    const withinRadius = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT wp.id
      FROM worker_profiles wp
      WHERE wp.id = ANY(${candidateIds}::text[])
        AND wp.location IS NOT NULL
        AND ST_DWithin(
          wp.location::geography,
          ST_SetSRID(ST_MakePoint(${lon}, ${lat}), 4326)::geography,
          ${radiusMeters}
        )
    `

    const withinIds = new Set(withinRadius.map((r) => r.id))

    // PostGIS 범위 내 인력만 반환 (location 없는 인력은 위치 기반 매칭에서 제외)
    return credFiltered
      .filter((p) => withinIds.has(p.id))
      .map((p) => ({ workerProfileId: p.id, userId: p.userId }))
  }

  // SOS 요청에 위치 정보가 없으면 자격증·분야 필터만 적용
  return credFiltered.map((p) => ({ workerProfileId: p.id, userId: p.userId }))
}
