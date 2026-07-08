import { prisma } from "@/lib/prisma"
import { AvailabilityStatus, CredentialStatus, SosMatchStatus, SosStatus } from "@prisma/client"

interface ScheduleDay {
  date: string      // "YYYY-MM-DD"
  endDate?: string  // "YYYY-MM-DD" (없으면 date와 동일)
  startTime: string // "HH:MM"
  endTime: string   // "HH:MM"
}

/** scheduleDays JSON → ScheduleDay[] 변환 */
function extractDays(days: unknown): ScheduleDay[] | null {
  if (!Array.isArray(days) || days.length === 0) return null
  const result: ScheduleDay[] = []
  for (const d of days) {
    if (
      d &&
      typeof d === "object" &&
      typeof (d as Record<string, unknown>).date === "string" &&
      typeof (d as Record<string, unknown>).startTime === "string" &&
      typeof (d as Record<string, unknown>).endTime === "string"
    ) {
      const entry = d as Record<string, string>
      result.push({
        date: entry.date,
        endDate: entry.endDate ?? entry.date,
        startTime: entry.startTime,
        endTime: entry.endTime,
      })
    }
  }
  return result.length > 0 ? result : null
}

/** "YYYY-MM-DD" + "HH:MM" → Date */
function toDatetime(date: string, time: string): Date {
  return new Date(`${date}T${time}:00`)
}

/**
 * 두 SOS 요청의 시간이 하나라도 겹치는지 확인.
 * scheduleDays가 있으면 세그먼트 단위로 비교, 없으면 scheduledAt~scheduledEndAt 비교.
 */
function scheduleOverlaps(
  aAt: Date,
  aEndAt: Date | null,
  aDays: unknown,
  bAt: Date,
  bEndAt: Date | null,
  bDays: unknown,
): boolean {
  const aDayList = extractDays(aDays)
  const bDayList = extractDays(bDays)

  // 두 쪽 모두 scheduleDays 있으면 세그먼트 쌍 비교
  if (aDayList && bDayList) {
    for (const a of aDayList) {
      const aStart = toDatetime(a.date, a.startTime)
      const aEnd = toDatetime(a.endDate ?? a.date, a.endTime)
      for (const b of bDayList) {
        const bStart = toDatetime(b.date, b.startTime)
        const bEnd = toDatetime(b.endDate ?? b.date, b.endTime)
        if (aStart < bEnd && bStart < aEnd) return true
      }
    }
    return false
  }

  // 한쪽만 scheduleDays 있으면 각 세그먼트를 단일 범위와 비교
  const singleA = { start: aAt, end: aEndAt ?? aAt }
  const singleB = { start: bAt, end: bEndAt ?? bAt }

  if (aDayList) {
    return aDayList.some((a) => {
      const aStart = toDatetime(a.date, a.startTime)
      const aEnd = toDatetime(a.endDate ?? a.date, a.endTime)
      return aStart < singleB.end && singleB.start < aEnd
    })
  }
  if (bDayList) {
    return bDayList.some((b) => {
      const bStart = toDatetime(b.date, b.startTime)
      const bEnd = toDatetime(b.endDate ?? b.date, b.endTime)
      return singleA.start < bEnd && bStart < singleA.end
    })
  }

  // 둘 다 scheduleDays 없으면 scheduledAt~scheduledEndAt 범위 비교
  return singleA.start < singleB.end && singleB.start < singleA.end
}

/**
 * SOS 요청에 매칭 가능한 경비 인력 목록을 반환한다.
 *
 * 매칭 조건:
 * 1. 가용 상태(AVAILABLE) 또는 다른 SOS에 확정(BUSY)이지만 날짜가 겹치지 않는 인력
 * 2. SOS 요청의 requiredFields와 workFields가 하나 이상 겹침
 * 3. SOS 요청의 requiredCredentials가 있을 경우 해당 자격증을 APPROVED 상태로 보유
 * 4. SOS 요청의 집결지 위치 기준 radiusKm 이내 (PostGIS ST_DWithin)
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
      scheduledAt: true,
      scheduledEndAt: true,
      scheduleDays: true,
    },
  })

  if (!sosRequest) return []

  // 이미 알림이 발송된 워커 ID 목록 (중복 발송 방지)
  const existingMatches = await prisma.sosMatch.findMany({
    where: { sosRequestId },
    select: { workerProfileId: true },
  })
  const alreadyNotifiedIds = existingMatches.map((m) => m.workerProfileId)

  // AVAILABLE + BUSY 모두 후보로 포함
  const candidateProfiles = await prisma.workerProfile.findMany({
    where: {
      availability: { in: [AvailabilityStatus.AVAILABLE, AvailabilityStatus.BUSY] },
      isProfilePublic: true,
      workFields: {
        hasSome: sosRequest.requiredFields,
      },
      ...(alreadyNotifiedIds.length > 0
        ? { id: { notIn: alreadyNotifiedIds } }
        : {}),
      user: {
        deletedAt: null,
      },
    },
    select: {
      id: true,
      userId: true,
      availability: true,
      latitude: true,
      longitude: true,
      credentials: {
        where: { status: CredentialStatus.APPROVED },
        select: { type: true },
      },
    },
  })

  if (candidateProfiles.length === 0) return []

  // 자격증 필터
  const requiredCreds = sosRequest.requiredCredentials
  let credFiltered =
    requiredCreds.length === 0
      ? candidateProfiles
      : candidateProfiles.filter((p) => {
          const approvedTypes = new Set(p.credentials.map((c) => c.type))
          return requiredCreds.every((rc) => approvedTypes.has(rc))
        })

  if (credFiltered.length === 0) return []

  // 모든 워커: ACCEPTED·CONFIRMED 매치와 날짜가 겹치면 제외
  // - BUSY 워커: CONFIRMED 매치 기준 (이미 확정된 일정)
  // - AVAILABLE 워커: ACCEPTED + CONFIRMED 매치 기준 (수락했지만 아직 확정 전 포함)
  const allCandidateIds = credFiltered.map((p) => p.id)
  const busyIds = new Set(
    credFiltered
      .filter((p) => p.availability === AvailabilityStatus.BUSY)
      .map((p) => p.id),
  )

  const overlapMatches = await prisma.sosMatch.findMany({
    where: {
      workerProfileId: { in: allCandidateIds },
      status: { in: [SosMatchStatus.ACCEPTED, SosMatchStatus.CONFIRMED] },
      sosRequest: {
        status: { notIn: [SosStatus.CANCELLED, SosStatus.COMPLETED] },
      },
    },
    select: {
      workerProfileId: true,
      status: true,
      sosRequest: {
        select: {
          scheduledAt: true,
          scheduledEndAt: true,
          scheduleDays: true,
        },
      },
    },
  })

  const conflictingIds = new Set<string>()
  for (const m of overlapMatches) {
    const isBusy = busyIds.has(m.workerProfileId)
    // BUSY 워커는 CONFIRMED만 체크, AVAILABLE 워커는 ACCEPTED + CONFIRMED 모두 체크
    if (isBusy && m.status === SosMatchStatus.ACCEPTED) continue

    if (
      scheduleOverlaps(
        sosRequest.scheduledAt,
        sosRequest.scheduledEndAt ?? null,
        sosRequest.scheduleDays,
        m.sosRequest.scheduledAt,
        m.sosRequest.scheduledEndAt ?? null,
        m.sosRequest.scheduleDays,
      )
    ) {
      conflictingIds.add(m.workerProfileId)
    }
  }

  // 날짜 충돌 워커 제거
  if (conflictingIds.size > 0) {
    credFiltered = credFiltered.filter((p) => !conflictingIds.has(p.id))
  }

  if (credFiltered.length === 0) return []

  // PostGIS 반경 필터 (ST_DWithin)
  if (sosRequest.latitude != null && sosRequest.longitude != null) {
    const radiusMeters = sosRequest.radiusKm * 1000
    const lat = sosRequest.latitude
    const lon = sosRequest.longitude
    const candidateIds = credFiltered.map((p) => p.id)

    const withinRadius = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT wp.id
      FROM worker_profiles wp
      WHERE wp.id = ANY(${candidateIds}::text[])
        AND (
          (
            wp.location IS NOT NULL
            AND ST_DWithin(
              wp.location::geography,
              ST_SetSRID(ST_MakePoint(${lon}, ${lat}), 4326)::geography,
              ${radiusMeters}
            )
          )
          OR (
            wp.location IS NULL
            AND wp.latitude IS NOT NULL
            AND wp.longitude IS NOT NULL
            AND ST_DWithin(
              ST_SetSRID(ST_MakePoint(wp.longitude, wp.latitude), 4326)::geography,
              ST_SetSRID(ST_MakePoint(${lon}, ${lat}), 4326)::geography,
              ${radiusMeters}
            )
          )
        )
    `

    const withinIds = new Set(withinRadius.map((r) => r.id))
    return credFiltered
      .filter((p) => withinIds.has(p.id))
      .map((p) => ({ workerProfileId: p.id, userId: p.userId }))
  }

  return credFiltered.map((p) => ({ workerProfileId: p.id, userId: p.userId }))
}

/**
 * 특정 경비 인력이 가입·가용 전환 시점에 이미 진행 중인 SOS 요청 중
 * 조건이 맞는 것을 찾아 SosMatch + 알림을 생성한다.
 *
 * 호출 시점:
 *  - 신규 WorkerProfile 생성 직후
 *  - availability 를 AVAILABLE 로 변경한 직후
 */
export async function matchSosRequestsForWorker(
  workerProfileId: string,
  workerUserId: string,
): Promise<number> {
  // 1. 워커 프로필 조회
  const worker = await prisma.workerProfile.findUnique({
    where: { id: workerProfileId },
    select: {
      id: true,
      availability: true,
      isProfilePublic: true,
      workFields: true,
      latitude: true,
      longitude: true,
      credentials: {
        where: { status: CredentialStatus.APPROVED },
        select: { type: true },
      },
    },
  })

  if (
    !worker ||
    worker.availability === AvailabilityStatus.UNAVAILABLE ||
    !worker.isProfilePublic ||
    worker.workFields.length === 0
  ) {
    return 0
  }

  // 2. 이미 알림이 발송된 SOS ID 목록
  const existingMatches = await prisma.sosMatch.findMany({
    where: { workerProfileId },
    select: { sosRequestId: true },
  })
  const alreadyNotifiedSosIds = new Set(existingMatches.map((m) => m.sosRequestId))

  // 3. 활성 SOS 요청 조회 (DISPATCHING · PENDING)
  const activeSos = await prisma.sosRequest.findMany({
    where: {
      status: { in: [SosStatus.DISPATCHING, SosStatus.PENDING] },
      requiredFields: { hasSome: worker.workFields },
      id: alreadyNotifiedSosIds.size > 0
        ? { notIn: Array.from(alreadyNotifiedSosIds) }
        : undefined,
    },
    select: {
      id: true,
      title: true,
      latitude: true,
      longitude: true,
      radiusKm: true,
      requiredCredentials: true,
      scheduledAt: true,
      scheduledEndAt: true,
      scheduleDays: true,
    },
  })

  if (activeSos.length === 0) return 0

  // 4. 워커의 기존 ACCEPTED/CONFIRMED 매치 일정 조회 (충돌 방지)
  const workerConflictMatches = await prisma.sosMatch.findMany({
    where: {
      workerProfileId,
      status: { in: [SosMatchStatus.ACCEPTED, SosMatchStatus.CONFIRMED] },
      sosRequest: { status: { notIn: [SosStatus.CANCELLED, SosStatus.COMPLETED] } },
    },
    select: {
      sosRequest: {
        select: { scheduledAt: true, scheduledEndAt: true, scheduleDays: true },
      },
    },
  })

  const approvedCredTypes = new Set(worker.credentials.map((c) => c.type))

  const matched: string[] = []

  for (const sos of activeSos) {
    // 자격증 조건
    if (sos.requiredCredentials.length > 0) {
      const allMet = sos.requiredCredentials.every((rc) => approvedCredTypes.has(rc as never))
      if (!allMet) continue
    }

    // 일정 충돌 확인
    const hasConflict = workerConflictMatches.some((m) =>
      scheduleOverlaps(
        sos.scheduledAt,
        sos.scheduledEndAt ?? null,
        sos.scheduleDays,
        m.sosRequest.scheduledAt,
        m.sosRequest.scheduledEndAt ?? null,
        m.sosRequest.scheduleDays,
      )
    )
    if (hasConflict) continue

    // 반경 확인 (SOS에 위치 정보가 있을 때만)
    if (sos.latitude != null && sos.longitude != null) {
      const radiusMeters = sos.radiusKm * 1000
      const lat = sos.latitude
      const lon = sos.longitude

      const inRadius = await prisma.$queryRaw<Array<{ ok: boolean }>>`
        SELECT (
          CASE
            WHEN wp.location IS NOT NULL THEN
              ST_DWithin(
                wp.location::geography,
                ST_SetSRID(ST_MakePoint(${lon}, ${lat}), 4326)::geography,
                ${radiusMeters}
              )
            WHEN wp.latitude IS NOT NULL AND wp.longitude IS NOT NULL THEN
              ST_DWithin(
                ST_SetSRID(ST_MakePoint(wp.longitude, wp.latitude), 4326)::geography,
                ST_SetSRID(ST_MakePoint(${lon}, ${lat}), 4326)::geography,
                ${radiusMeters}
              )
            ELSE false
          END
        ) AS ok
        FROM worker_profiles wp
        WHERE wp.id = ${workerProfileId}
      `
      if (!inRadius[0]?.ok) continue
    }

    matched.push(sos.id)
  }

  if (matched.length === 0) return 0

  // 5. SosMatch + 알림 생성
  const now = new Date()
  await prisma.sosMatch.createMany({
    data: matched.map((sosRequestId) => ({
      sosRequestId,
      workerProfileId,
      status: SosMatchStatus.NOTIFIED,
      notifiedAt: now,
    })),
    skipDuplicates: true,
  })

  const { createNotifications } = await import("./notify")
  await createNotifications(
    matched.map((sosRequestId) => ({
      userId: workerUserId,
      sosRequestId,
      type: "SOS_REQUEST",
      title: "SOS 긴급 요청 알림",
      body: "배치 조건에 맞는 긴급 경비 인력 요청이 있습니다. 지금 확인해 주세요.",
      sentAt: now,
    }))
  )

  return matched.length
}
