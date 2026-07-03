import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "@/lib/session"
import { requireApprovedCompany, CompanyNotApprovedError } from "@/lib/company-gate"
import {
  WorkField,
  CredentialType,
  UserRole,
  Prisma,
} from "@prisma/client"
import { createNotifications } from "@/lib/notify"

interface ScheduleDay {
  date: string
  startTime: string
  endTime: string
  endDate?: string
}

interface UpdateBody {
  title: string
  locationAddress: string
  scheduledAt: string
  scheduledEndAt?: string | null
  scheduleDays?: ScheduleDay[] | null
  requiredCount: number
  requiredFields: WorkField[]
  requiredCredentials: CredentialType[]
  hourlyRate: number
  description?: string | null
}

function parseBody(body: unknown): UpdateBody | null {
  if (typeof body !== "object" || body === null) return null
  const b = body as Record<string, unknown>

  if (typeof b.title !== "string" || !b.title.trim()) return null
  if (typeof b.locationAddress !== "string" || !b.locationAddress.trim()) return null
  if (typeof b.scheduledAt !== "string") return null
  if (typeof b.requiredCount !== "number" || b.requiredCount < 1) return null
  if (!Array.isArray(b.requiredFields) || b.requiredFields.length === 0) return null
  if (typeof b.hourlyRate !== "number" || b.hourlyRate < 0) return null

  const validWorkFields = Object.values(WorkField) as string[]
  for (const f of b.requiredFields) {
    if (typeof f !== "string" || !validWorkFields.includes(f)) return null
  }

  const requiredCredentials: CredentialType[] = []
  if (Array.isArray(b.requiredCredentials)) {
    const validCredTypes = Object.values(CredentialType) as string[]
    for (const c of b.requiredCredentials) {
      if (typeof c !== "string" || !validCredTypes.includes(c)) return null
      requiredCredentials.push(c as CredentialType)
    }
  }

  return {
    title: (b.title as string).trim(),
    locationAddress: (b.locationAddress as string).trim(),
    scheduledAt: b.scheduledAt as string,
    scheduledEndAt: typeof b.scheduledEndAt === "string" ? b.scheduledEndAt : null,
    scheduleDays: Array.isArray(b.scheduleDays) ? (b.scheduleDays as ScheduleDay[]) : null,
    requiredCount: b.requiredCount as number,
    requiredFields: b.requiredFields as WorkField[],
    requiredCredentials,
    hourlyRate: b.hourlyRate as number,
    description: typeof b.description === "string" ? b.description.trim() || null : null,
  }
}

// GET /api/sos/requests/[id] — 워커/업체 모두 접근 가능
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await getServerSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 })
  }

  const sos = await prisma.sosRequest.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      locationAddress: true,
      scheduledAt: true,
      scheduledEndAt: true,
      requiredCount: true,
      requiredFields: true,
      requiredCredentials: true,
      hourlyRate: true,
      description: true,
      status: true,
    },
  })
  if (!sos) return NextResponse.json({ error: "존재하지 않는 요청입니다." }, { status: 404 })

  return NextResponse.json(sos)
}

// PUT /api/sos/requests/[id]
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  // 1. 인증
  const session = await getServerSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 })
  }
  if (session.user.role !== UserRole.COMPANY_OWNER) {
    return NextResponse.json({ error: "업체 대표 계정만 접근할 수 있습니다." }, { status: 403 })
  }

  // 2. 업체 승인 확인
  let company
  try {
    company = await requireApprovedCompany(session.user.id)
  } catch (e) {
    if (e instanceof CompanyNotApprovedError) {
      return NextResponse.json({ error: "승인된 업체만 수정할 수 있습니다." }, { status: 403 })
    }
    throw e
  }

  // 3. 요청 소유권 확인
  const existing = await prisma.sosRequest.findUnique({
    where: { id },
    select: {
      id: true,
      companyId: true,
      status: true,
      title: true,
      locationAddress: true,
      scheduledAt: true,
      scheduledEndAt: true,
      requiredCount: true,
      requiredFields: true,
      requiredCredentials: true,
      hourlyRate: true,
      description: true,
    },
  })
  if (!existing) return NextResponse.json({ error: "존재하지 않는 요청입니다." }, { status: 404 })
  if (existing.companyId !== company.id) return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 })

  // 완료·취소된 요청은 수정 불가
  if (["COMPLETED", "CANCELLED"].includes(existing.status)) {
    return NextResponse.json({ error: "완료되거나 취소된 요청은 수정할 수 없습니다." }, { status: 409 })
  }

  // 4. 바디 파싱
  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: "잘못된 요청 형식입니다." }, { status: 400 })
  }
  const data = parseBody(body)
  if (!data) return NextResponse.json({ error: "요청 데이터가 올바르지 않습니다." }, { status: 400 })

  const scheduledAt = new Date(data.scheduledAt)
  if (isNaN(scheduledAt.getTime())) {
    return NextResponse.json({ error: "배치 날짜·시간 형식이 올바르지 않습니다." }, { status: 400 })
  }
  let scheduledEndAt: Date | null = null
  if (data.scheduledEndAt) {
    scheduledEndAt = new Date(data.scheduledEndAt)
    if (isNaN(scheduledEndAt.getTime())) scheduledEndAt = null
  }

  const addressParts = data.locationAddress.split(" ")
  const city = addressParts[0] ?? ""
  const district = addressParts[1] ?? ""

  // 5. SOS 업데이트
  await prisma.sosRequest.update({
    where: { id },
    data: {
      title: data.title,
      locationAddress: data.locationAddress,
      city,
      district,
      scheduledAt,
      scheduledEndAt,
      scheduleDays: data.scheduleDays
        ? (data.scheduleDays as unknown as Prisma.InputJsonValue)
        : Prisma.JsonNull,
      requiredCount: data.requiredCount,
      requiredFields: data.requiredFields,
      requiredCredentials: data.requiredCredentials,
      hourlyRate: data.hourlyRate,
      description: data.description,
    },
  })

  // 6. 매칭된 워커에게 수정 알림 발송 (NOTIFIED, ACCEPTED, CONFIRMED)
  const activeMatches = await prisma.sosMatch.findMany({
    where: {
      sosRequestId: id,
      status: { in: ["NOTIFIED", "ACCEPTED", "CONFIRMED"] },
    },
    select: {
      workerProfile: { select: { userId: true } },
    },
  })

  if (activeMatches.length > 0) {
    // 변경된 필드 diff 계산
    const changes: Array<{ field: string; label: string; before: string; after: string }> = []
    const fmt = (d: Date | null | undefined) =>
      d ? new Date(d).toLocaleString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—"

    if (existing.title !== data.title)
      changes.push({ field: "title", label: "제목", before: existing.title, after: data.title })
    if (existing.locationAddress !== data.locationAddress)
      changes.push({ field: "locationAddress", label: "장소", before: existing.locationAddress, after: data.locationAddress })
    if (fmt(existing.scheduledAt) !== fmt(scheduledAt))
      changes.push({ field: "scheduledAt", label: "배치 일시", before: fmt(existing.scheduledAt), after: fmt(scheduledAt) })
    if (fmt(existing.scheduledEndAt) !== fmt(scheduledEndAt))
      changes.push({ field: "scheduledEndAt", label: "종료 일시", before: fmt(existing.scheduledEndAt), after: fmt(scheduledEndAt) })
    if (existing.requiredCount !== data.requiredCount)
      changes.push({ field: "requiredCount", label: "필요 인원", before: `${existing.requiredCount}명`, after: `${data.requiredCount}명` })
    if (existing.hourlyRate !== data.hourlyRate)
      changes.push({ field: "hourlyRate", label: "시급", before: `${existing.hourlyRate.toLocaleString()}원/시간`, after: `${data.hourlyRate.toLocaleString()}원/시간` })
    if (JSON.stringify([...existing.requiredFields].sort()) !== JSON.stringify([...data.requiredFields].sort()))
      changes.push({ field: "requiredFields", label: "업무 분야", before: existing.requiredFields.join(", "), after: data.requiredFields.join(", ") })
    if (JSON.stringify([...existing.requiredCredentials].sort()) !== JSON.stringify([...data.requiredCredentials].sort()))
      changes.push({ field: "requiredCredentials", label: "필요 자격증", before: existing.requiredCredentials.join(", ") || "없음", after: data.requiredCredentials.join(", ") || "없음" })
    if ((existing.description ?? "") !== (data.description ?? ""))
      changes.push({ field: "description", label: "상세 설명", before: existing.description ?? "없음", after: data.description ?? "없음" })

    const notifBody = JSON.stringify({
      __v: 1,
      text: `'${data.title}' 요청의 내용이 업체에 의해 수정되었습니다. 확인해 주세요.`,
      changes,
    })

    await createNotifications(
      activeMatches.map((m) => ({
        userId: m.workerProfile.userId,
        sosRequestId: id,
        type: "SOS_UPDATED",
        title: "SOS 요청 내용 변경 안내",
        body: notifBody,
      })),
    )
  }

  return NextResponse.json({ sosRequestId: id, notifiedCount: activeMatches.length })
}
