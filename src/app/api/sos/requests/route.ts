export const dynamic = 'force-dynamic'
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

// ?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�
// ?�션 검�?
// ?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�

async function requireCompanyOwnerSession() {
  const session = await getServerSession()
  if (!session?.user?.id) {
    return { error: "로그?�이 ?�요?�니??", status: 401 as const }
  }
  if (session.user.role !== UserRole.COMPANY_OWNER) {
    return { error: "?�체 ?�??계정�??�근?????�습?�다.", status: 403 as const }
  }
  return { userId: session.user.id }
}

// ?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�
// ?�청 바디 ?�서
// ?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�

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

// ?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�
// POST /api/sos/requests
// ?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�

export async function POST(req: NextRequest) {
  // 1. ?�증 ?�인
  const authResult = await requireCompanyOwnerSession()
  if ("error" in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  // 2. ?�체 ?�인 ?�인
  let company
  try {
    company = await requireApprovedCompany(authResult.userId)
  } catch (e) {
    if (e instanceof CompanyNotApprovedError) {
      return NextResponse.json(
        { error: "?�인???�체�?SOS ?�청???�록?????�습?�다." },
        { status: 403 }
      )
    }
    throw e
  }

  // 3. ?�청 바디 ?�싱
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "?�못???�청 ?�식?�니??" }, { status: 400 })
  }

  const data = parseBody(body)
  if (!data) {
    return NextResponse.json({ error: "?�청 ?�이?��? ?�바르�? ?�습?�다." }, { status: 400 })
  }

  // 3-1. 최�??�금 방어
  // 배치 ?�정??근무?�간???�으�??�짜�??�제 근무?�간 × 최�??�급(10,320???�로 최�? ?�급 ?�정.
  // ?�간 ?�보가 ?�는 경우 법정 기본 8?�간(82,560?? 기�? ?�용.
  const MIN_HOURLY_WAGE = 10_320 // 2026??최�??�급
  const scheduledHours = data.scheduleDays
    ?.filter((d) => d.startTime && d.endTime)
    .map((d) => {
      const start = new Date(`${d.date}T${d.startTime}`)
      const end = new Date(`${d.endDate ?? d.date}T${d.endTime}`)
      return Math.max(0, (end.getTime() - start.getTime()) / (1000 * 60 * 60))
    }) ?? []
  const maxScheduledHours = scheduledHours.length > 0 ? Math.max(...scheduledHours) : 8
  const MIN_DAILY_WAGE = Math.ceil(maxScheduledHours * MIN_HOURLY_WAGE)

  if (data.hourlyRate < MIN_DAILY_WAGE) {
    return NextResponse.json(
      {
        error: `?�급?� 최장 근무??${maxScheduledHours}?�간) 기�? 최�??�금(${MIN_DAILY_WAGE.toLocaleString()}?? ?�상?�어???�니?? (최�??�급 10,320??× ${maxScheduledHours}h)`,
        minWage: MIN_DAILY_WAGE,
      },
      { status: 400 }
    )
  }

  // 3-2. ?�인???�액 ?�인 (매칭 ?�수�?+ 긴급??추�? 비용 + 부가??
  // ?�건비는 ?�체 ?�?��? 경비 ?�력?�게 직접 ?�체 ???�랫??결제?�서 ?�외
  const URGENCY_FEE: Record<string, number> = {
    NORMAL: 0,
    FAST: 5_000,
    URGENT: 10_000,
    CRITICAL: 15_000,
  }
  const totalCount = data.scheduleDays
    ? data.scheduleDays.reduce((sum, d) => sum + (d.requiredCount ?? 1), 0)
    : data.requiredCount
  const urgencyFee = URGENCY_FEE[data.urgencyLevel ?? "NORMAL"] ?? 0
  // 긴급??추�? 비용?� 경비 ?�력 ?�급???�함?�어 직접 ?�체 ???�수�?기�??�만 반영
  const effectiveDailyRate = data.hourlyRate + urgencyFee
  const laborCost = effectiveDailyRate * totalCount // ?�수�??�정 기�???(결제 ??�� ?�님)
  const serviceFee = Math.ceil(laborCost * 0.05)
  const vat = Math.ceil(serviceFee * 0.1)
  const requiredPoints = serviceFee + vat
  const pointAccount = await prisma.pointAccount.findUnique({
    where: { userId: authResult.userId },
  })
  if (!pointAccount || pointAccount.balance < requiredPoints) {
    return NextResponse.json(
      {
        error: `?�인?��? 부족합?�다. ?�요: ${requiredPoints.toLocaleString()}P, 보유: ${(pointAccount?.balance ?? 0).toLocaleString()}P`,
        requiredPoints,
        currentBalance: pointAccount?.balance ?? 0,
      },
      { status: 402 }
    )
  }

  // 3-3. 근무 ?�정�?24?�간 초과 검�?
  if (data.scheduleDays && data.scheduleDays.length > 0) {
    for (const d of data.scheduleDays) {
      if (d.date && d.endDate && d.startTime && d.endTime) {
        const startMs = new Date(`${d.date}T${d.startTime}`).getTime()
        const endMs = new Date(`${d.endDate}T${d.endTime}`).getTime()
        if (endMs - startMs > 24 * 60 * 60 * 1000) {
          return NextResponse.json(
            { error: "?�나??근무 ?�정?� 24?�간??초과?????�습?�다." },
            { status: 400 }
          )
        }
      }
    }
  }

  // 4. scheduledAt / scheduledEndAt ISO ?�짜 ?�싱
  const scheduledAt = new Date(data.scheduledAt)
  if (isNaN(scheduledAt.getTime())) {
    return NextResponse.json({ error: "배치 ?�짜·?�간 ?�식???�바르�? ?�습?�다." }, { status: 400 })
  }

  // 최소 12?�간 ???�청 조건 검�?
  const minScheduledAt = new Date(Date.now() + 12 * 60 * 60 * 1000)
  if (scheduledAt < minScheduledAt) {
    return NextResponse.json(
      { error: "배치 ?�작 ?�시???�재 ?�각?�로부??최소 12?�간 ?�후?�야 ?�니??" },
      { status: 400 }
    )
  }
  let scheduledEndAt: Date | null = null
  if (data.scheduledEndAt) {
    scheduledEndAt = new Date(data.scheduledEndAt)
    if (isNaN(scheduledEndAt.getTime()) || scheduledEndAt <= scheduledAt) {
      return NextResponse.json({ error: "종료 ?�시???�작 ?�시보다 ?�후?�야 ?�니??" }, { status: 400 })
    }
  }
  let applicationDeadline: Date | null = null
  if (data.applicationDeadline) {
    applicationDeadline = new Date(data.applicationDeadline)
    if (isNaN(applicationDeadline.getTime())) {
      return NextResponse.json({ error: "?�청 마감 ?�간 ?�식???�바르�? ?�습?�다." }, { status: 400 })
    }
  }

  // 5. 집결지 주소?�서 city/district ?�싱 (간단 ?�싱 ???�확??값�? 추후 주소 API ?�동)
  const addressParts = data.locationAddress.split(" ")
  const city = addressParts[0] ?? ""
  const district = addressParts[1] ?? ""
  const region = [city, district].filter(Boolean).join(" ")

  // 6. SOS ?�청 ?�성
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

  // 6-1. ?�인??차감
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
        description: `SOS ?�청: ${data.title} (매칭 ?�수�?${serviceFee.toLocaleString()}??+ 부가??${vat.toLocaleString()}??/ ?�건�?${laborCost.toLocaleString()}??{urgencyFee > 0 ? ` [긴급??${urgencyFee.toLocaleString()}???�함]` : ""}?� 직접 ?�체)`,
        sosRequestId: sosRequest.id,
      },
    }),
  ])

  // 7. PostGIS location ?�데?�트 (lat/lng 모두 ?�을 ??
  if (data.latitude != null && data.longitude != null) {
    try {
      // tagged template literal ?�수 (T-01-02-01)
      await prisma.$queryRaw`
        UPDATE sos_requests
        SET location = ST_SetSRID(ST_MakePoint(${data.longitude}, ${data.latitude}), 4326)::geography
        WHERE id = ${sosRequest.id}
      `
    } catch {
      // location ?�데?�트 ?�패?�도 ?�청 ?�성?� ?�공?�로 처리
    }
  }

  // 8. ?�력 매칭 ?�행
  const matched = await matchWorkers(sosRequest.id)
  const matchedCount = matched.length

  // 9. SosMatch + Notification ?�성
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
        title: "SOS 긴급 ?�청 ?�림",
        body: "긴급 경비 ?�력 배치 ?�청???�수?�었?�니?? 지�??�인??주세??",
        sentAt: now,
      })),
    )
  }

  // 10. 반경 ?�장 �?미해�?체크 ?��?줄링 (async, don't await)
  scheduleRadiusExpansion(sosRequest.id)
  scheduleUnresolvedCheck(sosRequest.id)

  return NextResponse.json({ sosRequestId: sosRequest.id, matchedCount }, { status: 201 })
}
