---
name: guardon-sos-engine
description: "GuardOn SOS 긴급 매칭 엔진 스킬. SOS 요청 생성·반경 필터링(geolib)·알림 발송, 인력 수락/거절, 업체 확정, 15분 후 반경 자동 확장(20km→50km), 1시간 후 미해결 처리, 매칭 이력 생성까지 전체 플로우를 구현한다."
---

# GuardOn — SOS 매칭 엔진 스킬

## 목적
GuardOn의 핵심 기능인 SOS 긴급 매칭 엔진을 구현한다.
- SOS 요청 생성 및 조건 기반 인력 필터링 (FR17~FR19)
- 반경 기반 알림 발송 (FR18, FR19)
- 인력 수락/거절 처리 (FR20, FR21)
- 업체 최종 확정 (FR21, FR22)
- 반경 자동 확장 (FR19: 15분 후 20km → 50km)
- 미해결 처리 (FR24: 1시간 후)
- 실시간 상태 조회 (FR23)

PRD 참조: `/G360/guardon-prd.md` — FR17~FR24

---

## 아키텍처 흐름

```
업체 대표 → POST /api/sos (SOS 생성)
         → 반경 20km 내 조건 부합 인력 조회 (geolib)
         → Kakao 알림톡 + SMS 발송 (guardon-kakao 스킬)
         → 상태: DISPATCHING

인력     → POST /api/sos/[id]/respond (수락/거절)
         → 상태: PENDING (수락자 풀 쌓임)

업체 대표 → POST /api/sos/[id]/confirm (특정 인력 확정)
         → 상태: CONFIRMED
         → 나머지 수락자에게 취소 알림

Background Job (15분 후 미확정)
         → 반경 50km로 확장 재발송 (FR19)

Background Job (1시간 후 미확정)
         → 상태: UNRESOLVED (FR24)
```

---

## Step 1. geo 유틸리티

`src/lib/geo.ts`:
```typescript
import { getDistance } from "geolib"

export function filterWorkersByRadius(
  workers: { latitude: number; longitude: number; id: string }[],
  center: { latitude: number; longitude: number },
  radiusKm: number
): string[] {
  return workers
    .filter((w) => {
      const distance = getDistance(
        { latitude: center.latitude, longitude: center.longitude },
        { latitude: w.latitude, longitude: w.longitude }
      )
      return distance <= radiusKm * 1000 // geolib은 미터 단위
    })
    .map((w) => w.id)
}

export function calculateDistance(
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number }
): number {
  return getDistance(from, to) / 1000 // km 반환
}
```

---

## Step 2. SOS 생성 API (FR17, FR18)

`src/app/api/sos/route.ts`:
```typescript
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { filterWorkersByRadius } from "@/lib/geo"
import { sendSosNotification } from "@/lib/kakao"
import { z } from "zod"
import { WorkField, CredentialType } from "@prisma/client"

const SosSchema = z.object({
  title: z.string().min(2),
  location: z.string(),
  city: z.string(),
  district: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  scheduledAt: z.string().datetime(),
  requiredCount: z.number().int().min(1).max(50),
  requiredFields: z.array(z.nativeEnum(WorkField)),
  requiredCredentials: z.array(z.nativeEnum(CredentialType)).optional(),
  hourlyRate: z.number().int().min(9860), // 2024 최저시급 이상
  description: z.string().optional(),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== "COMPANY_OWNER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // 업체 확인 + 활성 상태 체크
  const company = await prisma.company.findUnique({
    where: { ownerId: session.user.id },
  })
  if (!company?.isActive) {
    return NextResponse.json({ error: "업체 승인이 필요합니다." }, { status: 403 })
  }

  const body = await req.json()
  const parsed = SosSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors }, { status: 400 })
  }

  const { latitude, longitude, requiredFields, requiredCredentials } = parsed.data
  const INITIAL_RADIUS_KM = 20

  // 조건에 맞는 가용 인력 조회 (FR17, FR18)
  const eligibleWorkers = await prisma.workerProfile.findMany({
    where: {
      availability: "AVAILABLE",
      isProfilePublic: true,
      workFields: { hasSome: requiredFields },
      ...(requiredCredentials?.length
        ? {
            credentials: {
              some: {
                type: { in: requiredCredentials },
                status: "APPROVED",
              },
            },
          }
        : {}),
    },
    select: { id: true, latitude: true, longitude: true, userId: true },
  })

  // 반경 필터링
  const nearbyWorkerIds = filterWorkersByRadius(
    eligibleWorkers,
    { latitude, longitude },
    INITIAL_RADIUS_KM
  )
  const nearbyWorkers = eligibleWorkers.filter((w) => nearbyWorkerIds.includes(w.id))

  // SOS 요청 생성
  const sos = await prisma.sosRequest.create({
    data: {
      ...parsed.data,
      scheduledAt: new Date(parsed.data.scheduledAt),
      companyId: company.id,
      status: "DISPATCHING",
      radiusKm: INITIAL_RADIUS_KM,
      dispatchedAt: new Date(),
      requiredCredentials: requiredCredentials ?? [],
    },
  })

  // 알림 발송 (비동기, fire-and-forget)
  if (nearbyWorkers.length > 0) {
    const userIds = nearbyWorkers.map((w) => w.userId)
    sendSosNotification(sos.id, userIds).catch(console.error)
  }

  // 15분 후 반경 확장 스케줄 (FR19) — 프로덕션은 큐 사용, MVP는 timeout
  scheduleRadiusExpansion(sos.id, company.id, parsed.data, eligibleWorkers)

  return NextResponse.json(sos, { status: 201 })
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== "COMPANY_OWNER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const company = await prisma.company.findUnique({
    where: { ownerId: session.user.id },
  })
  if (!company) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const sosList = await prisma.sosRequest.findMany({
    where: { companyId: company.id },
    include: { responses: { include: { workerProfile: { include: { user: true } } } } },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(sosList)
}
```

---

## Step 3. 반경 확장 로직 (FR19)

`src/lib/sos-scheduler.ts`:
```typescript
import { prisma } from "./prisma"
import { filterWorkersByRadius } from "./geo"
import { sendSosNotification } from "./kakao"
import { WorkField, CredentialType } from "@prisma/client"

const EXPANSION_DELAY_MS = 15 * 60 * 1000  // 15분
const UNRESOLVED_DELAY_MS = 60 * 60 * 1000 // 1시간
const EXPANDED_RADIUS_KM = 50

interface SosData {
  latitude: number
  longitude: number
  requiredFields: WorkField[]
  requiredCredentials?: CredentialType[]
}

interface WorkerData {
  id: string
  latitude: number
  longitude: number
  userId: string
}

export function scheduleRadiusExpansion(
  sosId: string,
  companyId: string,
  sosData: SosData,
  alreadyNotified: WorkerData[]
) {
  // 15분 후 반경 확장 (FR19)
  const expansionTimer = setTimeout(async () => {
    const sos = await prisma.sosRequest.findUnique({ where: { id: sosId } })

    // 이미 CONFIRMED이면 스킵
    if (!sos || sos.status === "CONFIRMED" || sos.status === "CANCELLED") {
      return
    }

    // 50km 반경 재조회
    const allWorkers = await prisma.workerProfile.findMany({
      where: {
        availability: "AVAILABLE",
        isProfilePublic: true,
        workFields: { hasSome: sosData.requiredFields },
      },
      select: { id: true, latitude: true, longitude: true, userId: true },
    })

    const expandedIds = filterWorkersByRadius(
      allWorkers,
      { latitude: sosData.latitude, longitude: sosData.longitude },
      EXPANDED_RADIUS_KM
    )

    // 이미 알림 받은 인력 제외
    const alreadyNotifiedIds = new Set(alreadyNotified.map((w) => w.id))
    const newWorkers = allWorkers.filter(
      (w) => expandedIds.includes(w.id) && !alreadyNotifiedIds.has(w.id)
    )

    if (newWorkers.length > 0) {
      await prisma.sosRequest.update({
        where: { id: sosId },
        data: { radiusKm: EXPANDED_RADIUS_KM, expandedAt: new Date() },
      })
      const userIds = newWorkers.map((w) => w.userId)
      await sendSosNotification(sosId, userIds)
    }
  }, EXPANSION_DELAY_MS)

  // 1시간 후 미해결 처리 (FR24)
  setTimeout(async () => {
    const sos = await prisma.sosRequest.findUnique({ where: { id: sosId } })
    if (!sos || sos.status === "CONFIRMED" || sos.status === "CANCELLED") {
      clearTimeout(expansionTimer)
      return
    }

    await prisma.sosRequest.update({
      where: { id: sosId },
      data: { status: "UNRESOLVED", unresolvedAt: new Date() },
    })

    // 관리자 알림 발송
    const admins = await prisma.user.findMany({ where: { role: "ADMIN" } })
    // sendAdminNotification(sosId, admins.map(a => a.id))
  }, UNRESOLVED_DELAY_MS)
}
```

---

## Step 4. 인력 수락/거절 API (FR20)

`src/app/api/sos/[id]/respond/route.ts`:
```typescript
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== "WORKER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { action } = await req.json() // 'ACCEPTED' | 'REJECTED'
  if (!["ACCEPTED", "REJECTED"].includes(action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  }

  const workerProfile = await prisma.workerProfile.findUnique({
    where: { userId: session.user.id },
  })
  if (!workerProfile) return NextResponse.json({ error: "Profile not found" }, { status: 404 })

  const sos = await prisma.sosRequest.findUnique({ where: { id: params.id } })
  if (!sos || !["DISPATCHING", "PENDING"].includes(sos.status)) {
    return NextResponse.json({ error: "SOS 요청이 유효하지 않습니다." }, { status: 400 })
  }

  const response = await prisma.sosResponse.upsert({
    where: {
      sosRequestId_workerProfileId: {
        sosRequestId: params.id,
        workerProfileId: workerProfile.id,
      },
    },
    update: { status: action, respondedAt: new Date() },
    create: {
      sosRequestId: params.id,
      workerProfileId: workerProfile.id,
      status: action,
      respondedAt: new Date(),
    },
  })

  // 첫 수락 시 SOS 상태를 PENDING으로 (FR23)
  if (action === "ACCEPTED" && sos.status === "DISPATCHING") {
    await prisma.sosRequest.update({
      where: { id: params.id },
      data: { status: "PENDING" },
    })
  }

  return NextResponse.json(response)
}
```

---

## Step 5. 업체 확정 API (FR21, FR22)

`src/app/api/sos/[id]/confirm/route.ts`:
```typescript
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== "COMPANY_OWNER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { workerProfileIds } = await req.json() // 확정할 인력 ID 배열

  const company = await prisma.company.findUnique({
    where: { ownerId: session.user.id },
  })

  const sos = await prisma.sosRequest.findFirst({
    where: { id: params.id, companyId: company?.id },
    include: { responses: true },
  })

  if (!sos) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (workerProfileIds.length > sos.requiredCount) {
    return NextResponse.json({ error: "필요 인원 초과" }, { status: 400 })
  }

  // 트랜잭션으로 한번에 처리
  await prisma.$transaction(async (tx) => {
    // 선택 인력 → CONFIRMED
    await tx.sosResponse.updateMany({
      where: {
        sosRequestId: params.id,
        workerProfileId: { in: workerProfileIds },
      },
      data: { status: "CONFIRMED", confirmedAt: new Date() },
    })

    // 나머지 수락자 → DECLINED
    await tx.sosResponse.updateMany({
      where: {
        sosRequestId: params.id,
        workerProfileId: { notIn: workerProfileIds },
        status: "ACCEPTED",
      },
      data: { status: "DECLINED" },
    })

    // SOS 상태 → CONFIRMED
    await tx.sosRequest.update({
      where: { id: params.id },
      data: { status: "CONFIRMED", confirmedAt: new Date() },
    })

    // 매칭 이력 생성 (FR28, FR29)
    await tx.matchHistory.createMany({
      data: workerProfileIds.map((wpId: string) => ({
        sosRequestId: params.id,
        companyId: company!.id,
        workerProfileId: wpId,
        status: "COMPLETED",
        scheduledAt: sos.scheduledAt,
        hourlyRate: sos.hourlyRate,
      })),
    })

    // 인력 상태 → BUSY
    await tx.workerProfile.updateMany({
      where: { id: { in: workerProfileIds } },
      data: { availability: "BUSY" },
    })
  })

  // 확정 알림 발송 (비동기)
  // sendConfirmationNotifications(params.id, workerProfileIds)

  return NextResponse.json({ success: true })
}
```

---

## Step 6. SOS 상태 조회 API (FR23)

`src/app/api/sos/[id]/route.ts`:
```typescript
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const sos = await prisma.sosRequest.findUnique({
    where: { id: params.id },
    include: {
      company: { select: { id: true, name: true } },
      responses: {
        where: { status: { in: ["ACCEPTED", "CONFIRMED"] } },
        include: {
          workerProfile: {
            select: {
              id: true,
              experienceYears: true,
              averageRating: true,
              workFields: true,
              credentials: {
                where: { status: "APPROVED" },
                select: { type: true },
              },
              user: { select: { name: true, phone: true } },
            },
          },
        },
      },
    },
  })

  if (!sos) return NextResponse.json({ error: "Not found" }, { status: 404 })

  // 업체 소유자만 응답자 상세 조회 가능 (테넌트 격리 FR39)
  if (session.user.role === "COMPANY_OWNER") {
    const company = await prisma.company.findUnique({ where: { ownerId: session.user.id } })
    if (sos.companyId !== company?.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
  }

  return NextResponse.json(sos)
}
```

---

## Step 7. 인력용 SOS 알림 목록 API

`src/app/api/workers/sos-requests/route.ts`:
```typescript
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== "WORKER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // 내 프로필로 발송된 SOS 중 아직 수락/거절 안한 것
  const workerProfile = await prisma.workerProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  })

  const notifications = await prisma.notification.findMany({
    where: {
      userId: session.user.id,
      type: "SOS_REQUEST",
      sosRequest: { status: { in: ["DISPATCHING", "PENDING"] } },
    },
    include: {
      sosRequest: {
        select: {
          id: true,
          title: true,
          location: true,
          scheduledAt: true,
          requiredCount: true,
          requiredFields: true,
          hourlyRate: true,
          status: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(notifications)
}
```

---

## 성공 기준
- SOS 생성 → 반경 20km 내 조건 부합 인력에게 알림 발송
- 인력 수락 → SOS 상태 DISPATCHING → PENDING 전환
- 업체 확정 → SOS 상태 CONFIRMED, MatchHistory 생성
- 15분 후 미확정 시 반경 50km 확장 및 신규 인력 알림
- 1시간 후 미해결 시 UNRESOLVED 상태 전환
- 테넌트 격리: 다른 업체의 SOS 접근 시 403 응답
