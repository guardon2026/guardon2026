export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { WorkField, CredentialType, AvailabilityStatus } from "@prisma/client"
import { matchSosRequestsForWorker } from "@/lib/sos-matcher"

// ?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€
// ê³µí†µ ?¬í¼
// ?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€

async function requireWorkerSession() {
  const session = await getServerSession()
  if (!session?.user?.id) {
    return { error: "ë¡œê·¸?¸ì´ ?„ìš”?©ë‹ˆ??", status: 401 as const }
  }
  if (session.user.role !== "WORKER") {
    return { error: "ê²½ë¹„ ?¸ë ¥ ê³„ì •ë§??‘ê·¼?????ˆìŠµ?ˆë‹¤.", status: 403 as const }
  }
  return { userId: session.user.id }
}

function parseBody(body: unknown): {
  workFields?: WorkField[]
  declaredCredentials?: CredentialType[]
  experienceYears?: number
  address?: string
  city?: string
  district?: string
  desiredHourlyRate?: number | null
  height?: number | null
  weight?: number | null
  bio?: string | null
} | null {
  if (typeof body !== "object" || body === null) return null
  const b = body as Record<string, unknown>

  if (b.workFields !== undefined) {
    if (!Array.isArray(b.workFields)) return null
    const validFields = Object.values(WorkField) as string[]
    for (const f of b.workFields) {
      if (typeof f !== "string" || !validFields.includes(f)) return null
    }
  }

  if (b.declaredCredentials !== undefined) {
    if (!Array.isArray(b.declaredCredentials)) return null
    const validCreds = Object.values(CredentialType) as string[]
    for (const c of b.declaredCredentials) {
      if (typeof c !== "string" || !validCreds.includes(c)) return null
    }
  }

  return {
    workFields: b.workFields as WorkField[] | undefined,
    declaredCredentials: b.declaredCredentials as CredentialType[] | undefined,
    experienceYears: b.experienceYears !== undefined ? Number(b.experienceYears) : undefined,
    address: typeof b.address === "string" ? b.address : undefined,
    city: typeof b.city === "string" ? b.city : undefined,
    district: typeof b.district === "string" ? b.district : undefined,
    desiredHourlyRate:
      b.desiredHourlyRate !== undefined
        ? b.desiredHourlyRate === null ? null : Number(b.desiredHourlyRate)
        : undefined,
    height: b.height !== undefined ? (b.height === null ? null : Number(b.height)) : undefined,
    weight: b.weight !== undefined ? (b.weight === null ? null : Number(b.weight)) : undefined,
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

async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const url = new URL("https://nominatim.openstreetmap.org/search")
    url.searchParams.set("q", address)
    url.searchParams.set("format", "json")
    url.searchParams.set("limit", "1")
    url.searchParams.set("countrycodes", "kr")
    url.searchParams.set("accept-language", "ko")

    const res = await fetch(url.toString(), {
      headers: { "User-Agent": "guardon-app/1.0 (https://guardon.kr)" },
    })
    if (!res.ok) return null
    const data = await res.json() as { lat: string; lon: string }[]
    const doc = data[0]
    if (!doc) return null
    return { lat: parseFloat(doc.lat), lng: parseFloat(doc.lon) }
  } catch {
    return null
  }
}

// ?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€
// GET /api/worker/profile
// ?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€

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

// ?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€
// POST /api/worker/profile ??? ê·œ ?ì„±
// ?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€

export async function POST(req: NextRequest) {
  const auth_result = await requireWorkerSession()
  if ("error" in auth_result) {
    return NextResponse.json({ error: auth_result.error }, { status: auth_result.status })
  }

  // ?´ë? ì¡´ì¬?˜ë©´ ì¶©ëŒ
  const existing = await prisma.workerProfile.findUnique({
    where: { userId: auth_result.userId },
    select: { id: true },
  })
  if (existing) {
    return NextResponse.json({ error: "?´ë? ?„ë¡œ?„ì´ ì¡´ì¬?©ë‹ˆ??" }, { status: 409 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "?˜ëª»???”ì²­ ?•ì‹?…ë‹ˆ??" }, { status: 400 })
  }

  const data = parseBody(body)
  if (!data) {
    return NextResponse.json({ error: "?”ì²­ ?°ì´?°ê? ?¬ë°”ë¥´ì? ?ŠìŠµ?ˆë‹¤." }, { status: 400 })
  }

  // ?„ìˆ˜ ?„ë“œ ê²€ì¦?  if (!data.workFields || data.workFields.length === 0) {
    return NextResponse.json({ error: "?…ë¬´ ë¶„ì•¼ë¥??˜ë‚˜ ?´ìƒ ? íƒ??ì£¼ì„¸??" }, { status: 400 })
  }
  if (!data.address?.trim()) {
    return NextResponse.json({ error: "ì£¼ì†Œë¥??…ë ¥??ì£¼ì„¸??" }, { status: 400 })
  }
  if (!data.city?.trim()) {
    return NextResponse.json({ error: "?œÂ·ë„ë¥??…ë ¥??ì£¼ì„¸??" }, { status: 400 })
  }
  if (!data.district?.trim()) {
    return NextResponse.json({ error: "êµ?·êµ°???…ë ¥??ì£¼ì„¸??" }, { status: 400 })
  }

  const profile = await prisma.workerProfile.create({
    data: {
      userId: auth_result.userId,
      workFields: data.workFields,
      declaredCredentials: data.declaredCredentials ?? [],
      experienceYears: data.experienceYears ?? 0,
      address: data.address.trim(),
      city: data.city.trim(),
      district: data.district.trim(),
      desiredHourlyRate: data.desiredHourlyRate ?? null,
      height: data.height ?? null,
      weight: data.weight ?? null,
      bio: data.bio ?? null,
      availability: AvailabilityStatus.AVAILABLE,
    },
  })

  // ì£¼ì†Œ ê¸°ë°˜ ì¢Œí‘œ ?¤ì •
  const coords = await geocodeAddress(data.address.trim())
  if (coords) {
    await prisma.workerProfile.update({
      where: { id: profile.id },
      data: { latitude: coords.lat, longitude: coords.lng },
    })
    await updateLocation(profile.id, coords.lat, coords.lng)
  }

  // ê°€???œì ??ì§„í–‰ ì¤‘ì¸ SOS ?”ì²­ ì¤?ì¡°ê±´??ë§ëŠ” ê²ƒì— ?Œë¦¼ ë°œì†¡ (fire-and-forget)
  void matchSosRequestsForWorker(profile.id, auth_result.userId)

  return NextResponse.json({ profile }, { status: 201 })
}

// ?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€
// PATCH /api/worker/profile ??ê¸°ì¡´ ?˜ì •
// ?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€

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
    return NextResponse.json({ error: "?„ë¡œ?„ì„ ì°¾ì„ ???†ìŠµ?ˆë‹¤." }, { status: 404 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "?˜ëª»???”ì²­ ?•ì‹?…ë‹ˆ??" }, { status: 400 })
  }

  const data = parseBody(body)
  if (!data) {
    return NextResponse.json({ error: "?”ì²­ ?°ì´?°ê? ?¬ë°”ë¥´ì? ?ŠìŠµ?ˆë‹¤." }, { status: 400 })
  }

  // workFieldsê°€ ?„ë‹¬??ê²½ìš° ë¹„ì–´?ˆìœ¼ë©??¤ë¥˜
  if (data.workFields !== undefined && data.workFields.length === 0) {
    return NextResponse.json({ error: "?…ë¬´ ë¶„ì•¼ë¥??˜ë‚˜ ?´ìƒ ? íƒ??ì£¼ì„¸??" }, { status: 400 })
  }

  // undefined ?„ë“œ???…ë°?´íŠ¸?ì„œ ?œì™¸ (Prisma??undefinedë¥?ë¬´ì‹œ)
  const updateData: Record<string, unknown> = {}
  if (data.workFields !== undefined) updateData.workFields = data.workFields
  if (data.declaredCredentials !== undefined) updateData.declaredCredentials = data.declaredCredentials
  if (data.experienceYears !== undefined) updateData.experienceYears = data.experienceYears
  if (data.address !== undefined) updateData.address = data.address.trim()
  if (data.city !== undefined) updateData.city = data.city.trim()
  if (data.district !== undefined) updateData.district = data.district.trim()
  if (data.desiredHourlyRate !== undefined) updateData.desiredHourlyRate = data.desiredHourlyRate
  if (data.height !== undefined) updateData.height = data.height
  if (data.weight !== undefined) updateData.weight = data.weight
  if (data.bio !== undefined) updateData.bio = data.bio

  const profile = await prisma.workerProfile.update({
    where: { id: existing.id },
    data: updateData,
  })

  // ì£¼ì†Œê°€ ë³€ê²½ëœ ê²½ìš° ì¢Œí‘œ ?¬ì„¤??  if (data.address !== undefined) {
    const coords = await geocodeAddress(data.address.trim())
    if (coords) {
      await prisma.workerProfile.update({
        where: { id: existing.id },
        data: { latitude: coords.lat, longitude: coords.lng },
      })
      await updateLocation(existing.id, coords.lat, coords.lng)
    }
  }

  // ?…ë¬´ ë¶„ì•¼Â·ì£¼ì†Œ ë³€ê²???ì¡°ê±´??ë§ëŠ” ?œì„± SOS ?¬ë§¤ì¹?(fire-and-forget)
  if (data.workFields !== undefined || data.address !== undefined) {
    void matchSosRequestsForWorker(existing.id, auth_result.userId)
  }

  return NextResponse.json({ profile })
}
