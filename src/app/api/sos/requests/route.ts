import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "@/lib/session"
import { requireApprovedCompany, CompanyNotApprovedError } from "@/lib/company-gate"
import { matchWorkers } from "@/lib/sos-matcher"
import { scheduleRadiusExpansion, scheduleUnresolvedCheck } from "@/lib/sos-scheduler"
import { createNotifications } from "@/lib/notify"
import {
  WorkField,
  CredentialType,
  SosStatus,
  SosMatchStatus,
  SosUrgency,
  SosVisibility,
  UserRole,
  Prisma,
} from "@prisma/client"

// ─────────────────────────────────────────
// 세션 검증
// ─────────────────────────────────────────

async function requireCompanyOwnerSession() {
  const session = await getServerSession()
  if (!session?.user?.id) {
    return { error: "로그인이 필요합니다.", status: 401 as const }
  }
  if (session.user.role !== UserRole.COMPANY_OWNER) {
    return { error: "업체 대표 계정만 접근할 수 있습니다.", status: 403 as const }
  }
  return { userId: session.user.id }
}

// ─────────────────────────────────────────
// 요청 바디 파서
// ─────────────────────────────────────────

interface ScheduleDay {
  date: string
  startTime: string
  endTime: string
  endDate?: string
  requiredCount?: number
}

interface SosRequestBody {
  title: string
  locationAddress: string
  latitude?: number | null
  longitude?: number | null
  scheduledAt: string
  scheduledEndAt?: string | null
  scheduleDays?: ScheduleDay[] | null
  requiredCount: number
  requiredFields: WorkField[]
  requiredCredentials: CredentialType[]
  hourlyRate: number
  urgencyLevel?: SosUrgency
  serviceType?: string | null
  addressDetail?: string | null
  applicationDeadline?: string | null
  budgetTotal?: number | null
  budgetPerPerson?: number | null
  budgetType?: string | null
  paymentMethod?: string | null
  requirements?: Record<string, unknown> | null
  visibility?: SosVisibility
  allowCompanyApplicants?: boolean
  allowGuardApplicants?: boolean
  ownerContactVisible?: boolean
  isAdConfirmed?: boolean
  siteManagerContact?: string | null
  dressCode?: string | null
  dressCodeNote?: string | null
  description?: string | null
  receiptInfo?: unknown | null
}

const VALID_DRESS_CODES = ["FORMAL", "TACTICAL", "CASUAL", "OTHER"]

function parseBody(body: unknown): SosRequestBody | null {
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

  const validUrgencies = Object.values(SosUrgency) as string[]
  const urgencyLevel =
    typeof b.urgencyLevel === "string" && validUrgencies.includes(b.urgencyLevel)
      ? (b.urgencyLevel as SosUrgency)
      : SosUrgency.URGENT

  const validVisibilities = Object.values(SosVisibility) as string[]
  const visibility =
    typeof b.visibility === "string" && validVisibilities.includes(b.visibility)
      ? (b.visibility as SosVisibility)
      : SosVisibility.APPROVED_USERS

  const readOptionalNumber = (value: unknown) => {
    if (value === null || value === undefined || value === "") return null
    const num = Number(value)
    return Number.isFinite(num) && num >= 0 ? Math.round(num) : null
  }

  return {
    title: (b.title as string).trim(),
    locationAddress: (b.locationAddress as string).trim(),
    latitude: b.latitude != null ? Number(b.latitude) : null,
    longitude: b.longitude != null ? Number(b.longitude) : null,
    scheduledAt: b.scheduledAt as string,
    scheduledEndAt: typeof b.scheduledEndAt === "string" ? b.scheduledEndAt : null,
    scheduleDays: Array.isArray(b.scheduleDays) ? (b.scheduleDays as ScheduleDay[]) : null,
    requiredCount: b.requiredCount as number,
    requiredFields: b.requiredFields as WorkField[],
    requiredCredentials,
    hourlyRate: b.hourlyRate as number,
    urgencyLevel,
    serviceType: typeof b.serviceType === "string" ? b.serviceType.trim() || null : null,
    addressDetail: typeof b.addressDetail === "string" ? b.addressDetail.trim() || null : null,
    applicationDeadline: typeof b.applicationDeadline === "string" ? b.applicationDeadline : null,
    budgetTotal: readOptionalNumber(b.budgetTotal),
    budgetPerPerson: readOptionalNumber(b.budgetPerPerson),
    budgetType: typeof b.budgetType === "string" ? b.budgetType.trim() || "DAILY" : "DAILY",
    paymentMethod: typeof b.paymentMethod === "string" ? b.paymentMethod.trim() || null : null,
    requirements: typeof b.requirements === "object" && b.requirements !== null
      ? (b.requirements as Record<string, unknown>)
      : null,
    visibility,
    allowCompanyApplicants: typeof b.allowCompanyApplicants === "boolean" ? b.allowCompanyApplicants : true,
    allowGuardApplicants: typeof b.allowGuardApplicants === "boolean" ? b.allowGuardApplicants : true,
    ownerContactVisible: typeof b.ownerContactVisible === "boolean" ? b.ownerContactVisible : false,
    isAdConfirmed: typeof b.isAdConfirmed === "boolean" ? b.isAdConfirmed : false,
    siteManagerContact: typeof b.siteManagerContact === "string" ? b.siteManagerContact.trim() || null : null,
    dressCode: typeof b.dressCode === "string" ? b.dressCode.trim() || null : null,
    dressCodeNote: typeof b.dressCodeNote === "string" ? b.dressCodeNote.trim() || null : null,
    description: typeof b.description === "string" ? b.description.trim() || null : null,
    receiptInfo: b.receiptInfo != null && typeof b.receiptInfo === "object" ? b.receiptInfo : null,
  }
}

// ─────────────────────────────────────────
// POST /api/sos/requests
// ─────────────────────────────────────────

export async function POST(req: NextRequest) {
  // 1. 인증 확인
  const authResult = await requireCompanyOwnerSession()
  if ("error" in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  // 2. 업체 승인 확인
  let company
  try {
    company = await requireApprovedCompany(authResult.userId)
  } catch (e) {
    if (e instanceof CompanyNotApprovedError) {
      return NextResponse.json(
        { error: "승인된 업체만 SOS 요청을 등록할 수 있습니다." },
        { status: 403 }
      )
    }
    throw e
  }

  // 3. 요청 바디 파싱
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

  // 3-1. 포인트 잔액 확인 (일급 × 필요 인원 + 5% 가드온 수수료 + 수수료 부가세 10%)
  const totalCount = data.scheduleDays
    ? data.scheduleDays.reduce((sum, d) => sum + (d.requiredCount ?? 1), 0)
    : data.requiredCount
  const laborCost = data.hourlyRate * totalCount
  const serviceFee = Math.ceil(laborCost * 0.05)
  const vat = Math.ceil((laborCost + serviceFee) * 0.1)
  const requiredPoints = laborCost + serviceFee + vat
  const pointAccount = await prisma.pointAccount.findUnique({
    where: { userId: authResult.userId },
  })
  if (!pointAccount || pointAccount.balance < requiredPoints) {
    return NextResponse.json(
      {
        error: `포인트가 부족합니다. 필요: ${requiredPoints.toLocaleString()}P, 보유: ${(pointAccount?.balance ?? 0).toLocaleString()}P`,
        requiredPoints,
        currentBalance: pointAccount?.balance ?? 0,
      },
      { status: 402 }
    )
  }

  // 4. scheduledAt / scheduledEndAt ISO 날짜 파싱
  const scheduledAt = new Date(data.scheduledAt)
  if (isNaN(scheduledAt.getTime())) {
    return NextResponse.json({ error: "배치 날짜·시간 형식이 올바르지 않습니다." }, { status: 400 })
  }

  // 최소 12시간 전 신청 조건 검증
  const minScheduledAt = new Date(Date.now() + 12 * 60 * 60 * 1000)
  if (scheduledAt < minScheduledAt) {
    return NextResponse.json(
      { error: "배치 시작 일시는 현재 시각으로부터 최소 12시간 이후여야 합니다." },
      { status: 400 }
    )
  }
  let scheduledEndAt: Date | null = null
  if (data.scheduledEndAt) {
    scheduledEndAt = new Date(data.scheduledEndAt)
    if (isNaN(scheduledEndAt.getTime()) || scheduledEndAt <= scheduledAt) {
      return NextResponse.json({ error: "종료 일시는 시작 일시보다 이후여야 합니다." }, { status: 400 })
    }
  }
  let applicationDeadline: Date | null = null
  if (data.applicationDeadline) {
    applicationDeadline = new Date(data.applicationDeadline)
    if (isNaN(applicationDeadline.getTime())) {
      return NextResponse.json({ error: "신청 마감 시간 형식이 올바르지 않습니다." }, { status: 400 })
    }
  }

  // 5. 집결지 주소에서 city/district 파싱 (간단 파싱 — 정확한 값은 추후 주소 API 연동)
  const addressParts = data.locationAddress.split(" ")
  const city = addressParts[0] ?? ""
  const district = addressParts[1] ?? ""
  const region = [city, district].filter(Boolean).join(" ")

  // 6. SOS 요청 생성
  const sosRequest = await prisma.sosRequest.create({
    data: {
      companyId: company.id,
      title: data.title,
      locationAddress: data.locationAddress,
      city,
      district,
      latitude: data.latitude ?? null,
      longitude: data.longitude ?? null,
      scheduledAt,
      scheduledEndAt,
      scheduleDays: data.scheduleDays
        ? (data.scheduleDays as unknown as Prisma.InputJsonValue)
        : Prisma.JsonNull,
      requiredCount: data.requiredCount,
      requiredFields: data.requiredFields,
      requiredCredentials: data.requiredCredentials,
      hourlyRate: data.hourlyRate,
      urgencyLevel: data.urgencyLevel,
      serviceType: data.serviceType ?? "경호·보안",
      region,
      addressDetail: data.addressDetail,
      applicationDeadline,
      budgetTotal: data.budgetTotal ?? data.hourlyRate * data.requiredCount,
      budgetPerPerson: data.budgetPerPerson ?? data.hourlyRate,
      budgetType: data.budgetType ?? "DAILY",
      paymentMethod: data.paymentMethod,
      requirements: data.requirements
        ? (data.requirements as Prisma.InputJsonValue)
        : Prisma.JsonNull,
      visibility: data.visibility,
      allowCompanyApplicants: data.allowCompanyApplicants,
      allowGuardApplicants: data.allowGuardApplicants,
      ownerContactVisible: data.ownerContactVisible,
      isAdConfirmed: data.isAdConfirmed,
      siteManagerContact: data.siteManagerContact,
      dressCode: data.dressCode,
      dressCodeNote: data.dressCodeNote,
      description: data.description,
      receiptInfo: data.receiptInfo != null ? (data.receiptInfo as Prisma.InputJsonValue) : Prisma.JsonNull,
      status: SosStatus.DISPATCHING,
      dispatchedAt: new Date(),
    },
  })

  // 6-1. 포인트 차감
  await prisma.$transaction([
    prisma.pointAccount.update({
      where: { id: pointAccount.id },
      data: { balance: { decrement: requiredPoints } },
    }),
    prisma.pointTransaction.create({
      data: {
        accountId: pointAccount.id,
        amount: -requiredPoints,
        type: "SOS_DEDUCT",
        description: `SOS 요청: ${data.title} (인건비 ${laborCost.toLocaleString()}원 + 서비스 비용 ${serviceFee.toLocaleString()}원 + 부가세 ${vat.toLocaleString()}원)`,
        sosRequestId: sosRequest.id,
      },
    }),
  ])

  // 7. PostGIS location 업데이트 (lat/lng 모두 있을 때)
  if (data.latitude != null && data.longitude != null) {
    try {
      // tagged template literal 필수 (T-01-02-01)
      await prisma.$queryRaw`
        UPDATE sos_requests
        SET location = ST_SetSRID(ST_MakePoint(${data.longitude}, ${data.latitude}), 4326)::geography
        WHERE id = ${sosRequest.id}
      `
    } catch {
      // location 업데이트 실패해도 요청 생성은 성공으로 처리
    }
  }

  // 8. 인력 매칭 실행
  const matched = await matchWorkers(sosRequest.id)
  const matchedCount = matched.length

  // 9. SosMatch + Notification 생성
  if (matched.length > 0) {
    const now = new Date()

    await prisma.sosMatch.createMany({
      data: matched.map((m) => ({
        sosRequestId: sosRequest.id,
        workerProfileId: m.workerProfileId,
        status: SosMatchStatus.NOTIFIED,
        notifiedAt: now,
      })),
      skipDuplicates: true,
    })

    await createNotifications(
      matched.map((m) => ({
        userId: m.userId,
        sosRequestId: sosRequest.id,
        type: "SOS_REQUEST",
        title: "SOS 긴급 요청 알림",
        body: "긴급 경비 인력 배치 요청이 접수되었습니다. 지금 확인해 주세요.",
        sentAt: now,
      })),
    )
  }

  // 10. 반경 확장 및 미해결 체크 스케줄링 (async, don't await)
  scheduleRadiusExpansion(sosRequest.id)
  scheduleUnresolvedCheck(sosRequest.id)

  return NextResponse.json({ sosRequestId: sosRequest.id, matchedCount }, { status: 201 })
}
