import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { WorkField } from "@prisma/client"

// ─────────────────────────────────────────
// 공통 헬퍼
// ─────────────────────────────────────────

async function requireWorkerSession() {
  const session = await getServerSession()
  if (!session?.user?.id) {
    return { error: "로그인이 필요합니다.", status: 401 as const }
  }
  if (session.user.role !== "WORKER") {
    return { error: "경비 인력 계정만 접근할 수 있습니다.", status: 403 as const }
  }
  return { userId: session.user.id }
}

function parseBody(body: unknown): {
  workFields?: WorkField[]
  experienceYears?: number
  address?: string
  city?: string
  district?: string
  latitude?: number | null
  longitude?: number | null
  desiredHourlyRate?: number | null
  bio?: string | null
} | null {
  if (typeof body !== "object" || body === null) return null
  const b = body as Record<string, unknown>

  // workFields 유효성 검사
  if (b.workFields !== undefined) {
    if (!Array.isArray(b.workFields)) return null
    const validFields = Object.values(WorkField) as string[]
    for (const f of b.workFields) {
      if (typeof f !== "string" || !validFields.includes(f)) return null
    }
  }

  return {
    workFields: b.workFields as WorkField[] | undefined,
    experienceYears: b.experienceYears !== undefined ? Number(b.experienceYears) : undefined,
    address: typeof b.address === "string" ? b.address : undefined,
    city: typeof b.city === "string" ? b.city : undefined,
    district: typeof b.district === "string" ? b.district : undefined,
    latitude: b.latitude !== undefined ? (b.latitude === null ? null : Number(b.latitude)) : undefined,
    longitude: b.longitude !== undefined ? (b.longitude === null ? null : Number(b.longitude)) : undefined,
    desiredHourlyRate:
      b.desiredHourlyRate !== undefined
        ? b.desiredHourlyRate === null
          ? null
          : Number(b.desiredHourlyRate)
        : undefined,
    bio: b.bio !== undefined ? (b.bio === null ? null : String(b.bio)) : undefined,
  }
}

async function updateLocation(profileId: string, latitude: number, longitude: number) {
  await prisma.$queryRaw`
    UPDATE worker_profiles
    SET location = ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography
    WHERE id = ${profileId}
  `
}

// ─────────────────────────────────────────
// GET /api/worker/profile
// ─────────────────────────────────────────

export async function GET() {
  const auth_result = await requireWorkerSession()
  if ("error" in auth_result) {
    return NextResponse.json({ error: auth_result.error }, { status: auth_result.status })
  }

  const profile = await prisma.workerProfile.findUnique({
    where: { userId: auth_result.userId },
    include: {
      credentials: {
        select: {
          id: true,
          type: true,
          status: true,
          issuedDate: true,
          approvedAt: true,
        },
      },
    },
  })

  return NextResponse.json({ profile: profile ?? null })
}

// ─────────────────────────────────────────
// POST /api/worker/profile — 신규 생성
// ─────────────────────────────────────────

export async function POST(req: NextRequest) {
  const auth_result = await requireWorkerSession()
  if ("error" in auth_result) {
    return NextResponse.json({ error: auth_result.error }, { status: auth_result.status })
  }

  // 이미 존재하면 충돌
  const existing = await prisma.workerProfile.findUnique({
    where: { userId: auth_result.userId },
    select: { id: true },
  })
  if (existing) {
    return NextResponse.json({ error: "이미 프로필이 존재합니다." }, { status: 409 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "잘못된 요청 형식입니다." }, { status: 400 })
  }

  const data = parseBody(body)
  if (!data) {
    return NextResponse.json({ error: "요청 데이터가 올바르지 않습니다." }, { status: 400 })
  }

  // 필수 필드 검증
  if (!data.workFields || data.workFields.length === 0) {
    return NextResponse.json({ error: "업무 분야를 하나 이상 선택해 주세요." }, { status: 400 })
  }
  if (!data.address?.trim()) {
    return NextResponse.json({ error: "주소를 입력해 주세요." }, { status: 400 })
  }
  if (!data.city?.trim()) {
    return NextResponse.json({ error: "시·도를 입력해 주세요." }, { status: 400 })
  }
  if (!data.district?.trim()) {
    return NextResponse.json({ error: "구·군을 입력해 주세요." }, { status: 400 })
  }

  const profile = await prisma.workerProfile.create({
    data: {
      userId: auth_result.userId,
      workFields: data.workFields,
      experienceYears: data.experienceYears ?? 0,
      address: data.address.trim(),
      city: data.city.trim(),
      district: data.district.trim(),
      latitude: data.latitude ?? null,
      longitude: data.longitude ?? null,
      desiredHourlyRate: data.desiredHourlyRate ?? null,
      bio: data.bio ?? null,
    },
  })

  // PostGIS location 업데이트 (lat/lng 모두 있을 때)
  if (data.latitude != null && data.longitude != null) {
    try {
      await updateLocation(profile.id, data.latitude, data.longitude)
    } catch {
      // location 업데이트 실패해도 프로필 생성은 성공으로 처리
    }
  }

  return NextResponse.json({ profile }, { status: 201 })
}

// ─────────────────────────────────────────
// PATCH /api/worker/profile — 기존 수정
// ─────────────────────────────────────────

export async function PATCH(req: NextRequest) {
  const auth_result = await requireWorkerSession()
  if ("error" in auth_result) {
    return NextResponse.json({ error: auth_result.error }, { status: auth_result.status })
  }

  const existing = await prisma.workerProfile.findUnique({
    where: { userId: auth_result.userId },
    select: { id: true },
  })
  if (!existing) {
    return NextResponse.json({ error: "프로필을 찾을 수 없습니다." }, { status: 404 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "잘못된 요청 형식입니다." }, { status: 400 })
  }

  const data = parseBody(body)
  if (!data) {
    return NextResponse.json({ error: "요청 데이터가 올바르지 않습니다." }, { status: 400 })
  }

  // workFields가 전달된 경우 비어있으면 오류
  if (data.workFields !== undefined && data.workFields.length === 0) {
    return NextResponse.json({ error: "업무 분야를 하나 이상 선택해 주세요." }, { status: 400 })
  }

  // undefined 필드는 업데이트에서 제외 (Prisma는 undefined를 무시)
  const updateData: Record<string, unknown> = {}
  if (data.workFields !== undefined) updateData.workFields = data.workFields
  if (data.experienceYears !== undefined) updateData.experienceYears = data.experienceYears
  if (data.address !== undefined) updateData.address = data.address.trim()
  if (data.city !== undefined) updateData.city = data.city.trim()
  if (data.district !== undefined) updateData.district = data.district.trim()
  if (data.latitude !== undefined) updateData.latitude = data.latitude
  if (data.longitude !== undefined) updateData.longitude = data.longitude
  if (data.desiredHourlyRate !== undefined) updateData.desiredHourlyRate = data.desiredHourlyRate
  if (data.bio !== undefined) updateData.bio = data.bio

  const profile = await prisma.workerProfile.update({
    where: { id: existing.id },
    data: updateData,
  })

  // PostGIS location 업데이트
  if (data.latitude != null && data.longitude != null) {
    try {
      await updateLocation(profile.id, data.latitude, data.longitude)
    } catch {
      // location 업데이트 실패해도 응답은 성공으로 처리
    }
  }

  return NextResponse.json({ profile })
}
