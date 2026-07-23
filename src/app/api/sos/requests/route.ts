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

// ?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä
// ?∏ÏÖò Í≤ÄÏ¶?
// ?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä

async function requireCompanyOwnerSession() {
  const session = await getServerSession()
  if (!session?.user?.id) {
    return { error: "Î°úÍ∑∏?∏Ïù¥ ?ÑÏöî?©Îãà??", status: 401 as const }
  }
  if (session.user.role !== UserRole.COMPANY_OWNER) {
    return { error: "?ÖÏ≤¥ ?Ä??Í≥ÑÏ†ïÎß??ëÍ∑º?????àÏäµ?àÎã§.", status: 403 as const }
  }
  return { userId: session.user.id }
}

// ?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä
// ?îÏ≤≠ Î∞îÎîî ?åÏÑú
// ?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä

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

// ?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä
// POST /api/sos/requests
// ?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä

export async function POST(req: NextRequest) {
  // 1. ?∏Ï¶ù ?ïÏù∏
  const authResult = await requireCompanyOwnerSession()
  if ("error" in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  // 2. ?ÖÏ≤¥ ?πÏù∏ ?ïÏù∏
  let company
  try {
    company = await requireApprovedCompany(authResult.userId)
  } catch (e) {
    if (e instanceof CompanyNotApprovedError) {
      return NextResponse.json(
        { error: "?πÏù∏???ÖÏ≤¥Îß?SOS ?îÏ≤≠???±Î°ù?????àÏäµ?àÎã§." },
        { status: 403 }
      )
    }
    throw e
  }

  // 3. ?îÏ≤≠ Î∞îÎîî ?åÏã±
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "?òÎ™ª???îÏ≤≠ ?ïÏãù?ÖÎãà??" }, { status: 400 })
  }

  const data = parseBody(body)
  if (!data) {
    return NextResponse.json({ error: "?îÏ≤≠ ?∞Ïù¥?∞Í? ?¨Î∞îÎ•¥Ï? ?äÏäµ?àÎã§." }, { status: 400 })
  }

  // 3-1. ÏµúÏ??ÑÍ∏à Î∞©Ïñ¥
  // Î∞∞Ïπò ?ºÏ†ï??Í∑ºÎ¨¥?úÍ∞Ñ???àÏúºÎ©??†ÏßúÎ≥??§Ï†ú Í∑ºÎ¨¥?úÍ∞Ñ √ó ÏµúÏ??úÍ∏â(10,320???ºÎ°ú ÏµúÏ? ?ºÍ∏â ?∞Ï†ï.
  // ?úÍ∞Ñ ?ïÎ≥¥Í∞Ä ?ÜÎäî Í≤ΩÏö∞ Î≤ïÏ†ï Í∏∞Î≥∏ 8?úÍ∞Ñ(82,560?? Í∏∞Ï? ?ÅÏö©.
  const MIN_HOURLY_WAGE = 10_320 // 2026??ÏµúÏ??úÍ∏â
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
        error: `?ºÍ∏â?Ä ÏµúÏû• Í∑ºÎ¨¥??${maxScheduledHours}?úÍ∞Ñ) Í∏∞Ï? ÏµúÏ??ÑÍ∏à(${MIN_DAILY_WAGE.toLocaleString()}?? ?¥ÏÉÅ?¥Ïñ¥???©Îãà?? (ÏµúÏ??úÍ∏â 10,320??√ó ${maxScheduledHours}h)`,
        minWage: MIN_DAILY_WAGE,
      },
      { status: 400 }
    )
  }

  // 3-2. ?¨Ïù∏???îÏï° ?ïÏù∏ (Îß§Ïπ≠ ?òÏàòÎ£?+ Í∏¥Í∏â??Ï∂îÍ? ÎπÑÏö© + Î∂ÄÍ∞Ä??
  // ?∏Í±¥ÎπÑÎäî ?ÖÏ≤¥ ?Ä?úÍ? Í≤ΩÎπÑ ?∏Î†•?êÍ≤å ÏßÅÏ†ë ?¥Ï≤¥ ???åÎû´??Í≤∞Ï†ú?êÏÑú ?úÏô∏
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
  // Í∏¥Í∏â??Ï∂îÍ? ÎπÑÏö©?Ä Í≤ΩÎπÑ ?∏Î†• ?ºÍ∏â???¨Ìï®?òÏñ¥ ÏßÅÏ†ë ?¥Ï≤¥ ???òÏàòÎ£?Í∏∞Ï??êÎßå Î∞òÏòÅ
  const effectiveDailyRate = data.hourlyRate + urgencyFee
  const laborCost = effectiveDailyRate * totalCount // ?òÏàòÎ£??∞Ï†ï Í∏∞Ï???(Í≤∞Ï†ú ??™© ?ÑÎãò)
  const serviceFee = Math.ceil(laborCost * 0.05)
  const vat = Math.ceil(serviceFee * 0.1)
  const requiredPoints = serviceFee + vat
  const pointAccount = await prisma.pointAccount.findUnique({
    where: { userId: authResult.userId },
  })
  if (!pointAccount || pointAccount.balance < requiredPoints) {
    return NextResponse.json(
      {
        error: `?¨Ïù∏?∏Í? Î∂ÄÏ°±Ìï©?àÎã§. ?ÑÏöî: ${requiredPoints.toLocaleString()}P, Î≥¥Ïú†: ${(pointAccount?.balance ?? 0).toLocaleString()}P`,
        requiredPoints,
        currentBalance: pointAccount?.balance ?? 0,
      },
      { status: 402 }
    )
  }

  // 3-3. Í∑ºÎ¨¥ ?ºÏ†ïÎ≥?24?úÍ∞Ñ Ï¥àÍ≥º Í≤ÄÏ¶?
  if (data.scheduleDays && data.scheduleDays.length > 0) {
    for (const d of data.scheduleDays) {
      if (d.date && d.endDate && d.startTime && d.endTime) {
        const startMs = new Date(`${d.date}T${d.startTime}`).getTime()
        const endMs = new Date(`${d.endDate}T${d.endTime}`).getTime()
        if (endMs - startMs > 24 * 60 * 60 * 1000) {
          return NextResponse.json(
            { error: "?òÎÇò??Í∑ºÎ¨¥ ?ºÏ†ï?Ä 24?úÍ∞Ñ??Ï¥àÍ≥º?????ÜÏäµ?àÎã§." },
            { status: 400 }
          )
        }
      }
    }
  }

  // 4. scheduledAt / scheduledEndAt ISO ?†Ïßú ?åÏã±
  const scheduledAt = new Date(data.scheduledAt)
  if (isNaN(scheduledAt.getTime())) {
    return NextResponse.json({ error: "Î∞∞Ïπò ?†Ïßú¬∑?úÍ∞Ñ ?ïÏãù???¨Î∞îÎ•¥Ï? ?äÏäµ?àÎã§." }, { status: 400 })
  }

  // ÏµúÏÜå 12?úÍ∞Ñ ???†Ï≤≠ Ï°∞Í±¥ Í≤ÄÏ¶?
  const minScheduledAt = new Date(Date.now() + 12 * 60 * 60 * 1000)
  if (scheduledAt < minScheduledAt) {
    return NextResponse.json(
      { error: "Î∞∞Ïπò ?úÏûë ?ºÏãú???ÑÏû¨ ?úÍ∞Å?ºÎ°úÎ∂Ä??ÏµúÏÜå 12?úÍ∞Ñ ?¥ÌõÑ?¨Ïïº ?©Îãà??" },
      { status: 400 }
    )
  }
  let scheduledEndAt: Date | null = null
  if (data.scheduledEndAt) {
    scheduledEndAt = new Date(data.scheduledEndAt)
    if (isNaN(scheduledEndAt.getTime()) || scheduledEndAt <= scheduledAt) {
      return NextResponse.json({ error: "Ï¢ÖÎ£å ?ºÏãú???úÏûë ?ºÏãúÎ≥¥Îã§ ?¥ÌõÑ?¨Ïïº ?©Îãà??" }, { status: 400 })
    }
  }
  let applicationDeadline: Date | null = null
  if (data.applicationDeadline) {
    applicationDeadline = new Date(data.applicationDeadline)
    if (isNaN(applicationDeadline.getTime())) {
      return NextResponse.json({ error: "?†Ï≤≠ ÎßàÍ∞ê ?úÍ∞Ñ ?ïÏãù???¨Î∞îÎ•¥Ï? ?äÏäµ?àÎã§." }, { status: 400 })
    }
  }

  // 5. ÏßëÍ≤∞ÏßÄ Ï£ºÏÜå?êÏÑú city/district ?åÏã± (Í∞ÑÎã® ?åÏã± ???ïÌôï??Í∞íÏ? Ï∂îÌõÑ Ï£ºÏÜå API ?∞Îèô)
  const addressParts = data.locationAddress.split(" ")
  const city = addressParts[0] ?? ""
  const district = addressParts[1] ?? ""
  const region = [city, district].filter(Boolean).join(" ")

  // 6. SOS ?îÏ≤≠ ?ùÏÑ±
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
      serviceType: data.serviceType ?? "Í≤ΩÌò∏¬∑Î≥¥Ïïà",
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

  // 6-1. ?¨Ïù∏??Ï∞®Í∞ê
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
        description: `SOS ?îÏ≤≠: ${data.title} (Îß§Ïπ≠ ?òÏàòÎ£?${serviceFee.toLocaleString()}??+ Î∂ÄÍ∞Ä??${vat.toLocaleString()}??/ ?∏Í±¥Îπ?${laborCost.toLocaleString()}??{urgencyFee > 0 ? ` [Í∏¥Í∏â??${urgencyFee.toLocaleString()}???¨Ìï®]` : ""}?Ä ÏßÅÏ†ë ?¥Ï≤¥)`,
        sosRequestId: sosRequest.id,
      },
    }),
  ])

  // 7. PostGIS location ?ÖÎç∞?¥Ìä∏ (lat/lng Î™®Îëê ?àÏùÑ ??
  if (data.latitude != null && data.longitude != null) {
    try {
      // tagged template literal ?ÑÏàò (T-01-02-01)
      await prisma.$queryRaw`
        UPDATE sos_requests
        SET location = ST_SetSRID(ST_MakePoint(${data.longitude}, ${data.latitude}), 4326)::geography
        WHERE id = ${sosRequest.id}
      `
    } catch {
      // location ?ÖÎç∞?¥Ìä∏ ?§Ìå®?¥ÎèÑ ?îÏ≤≠ ?ùÏÑ±?Ä ?±Í≥µ?ºÎ°ú Ï≤òÎ¶¨
    }
  }

  // 8. ?∏Î†• Îß§Ïπ≠ ?§Ìñâ
  const matched = await matchWorkers(sosRequest.id)
  const matchedCount = matched.length

  // 9. SosMatch + Notification ?ùÏÑ±
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
        title: "SOS Í∏¥Í∏â ?îÏ≤≠ ?åÎ¶º",
        body: "Í∏¥Í∏â Í≤ΩÎπÑ ?∏Î†• Î∞∞Ïπò ?îÏ≤≠???ëÏàò?òÏóà?µÎãà?? ÏßÄÍ∏??ïÏù∏??Ï£ºÏÑ∏??",
        sentAt: now,
      })),
    )
  }

  // 10. Î∞òÍ≤Ω ?ïÏû• Î∞?ÎØ∏Ìï¥Í≤?Ï≤¥ÌÅ¨ ?§Ï?Ï§ÑÎßÅ (async, don't await)
  scheduleRadiusExpansion(sosRequest.id)
  scheduleUnresolvedCheck(sosRequest.id)

  return NextResponse.json({ sosRequestId: sosRequest.id, matchedCount }, { status: 201 })
}
