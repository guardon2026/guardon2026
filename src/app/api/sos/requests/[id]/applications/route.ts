export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from "next/server"
import { Prisma, SosApplicationStatus, UserRole } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "@/lib/session"
import { createNotifications } from "@/lib/notify"

const TERMINAL_SOS_STATUSES = ["CANCELLED", "COMPLETED", "UNRESOLVED"] as const

function readString(value: unknown, max = 1000): string | null {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  if (!trimmed) return null
  return trimmed.slice(0, max)
}

function readNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null
  const num = Number(value)
  return Number.isFinite(num) && num >= 0 ? Math.round(num) : null
}

function readDate(value: unknown): Date | null {
  if (typeof value !== "string" || !value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function isWorkerProfileComplete(profile: {
  address: string | null
  city: string | null
  district: string | null
  workFields: string[]
}) {
  return Boolean(profile.address?.trim() && profile.city?.trim() && profile.district?.trim() && profile.workFields.length > 0)
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
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
      company: { select: { ownerId: true } },
    },
  })
  if (!sos) return NextResponse.json({ error: "존재하지 않는 SOS 요청입니다." }, { status: 404 })

  if (session.user.role !== UserRole.ADMIN && sos.company.ownerId !== session.user.id) {
    return NextResponse.json({ error: "신청자 목록은 게시 업체와 관리자만 볼 수 있습니다." }, { status: 403 })
  }

  const applications = await prisma.sosApplication.findMany({
    where: { sosRequestId: id },
    include: {
      applicantUser: { select: { id: true, name: true, phone: true, email: true } },
      company: { select: { id: true, name: true, phone: true, city: true, district: true, kakaoOpenChatUrl: true } },
      workerProfile: {
        select: {
          id: true,
          city: true,
          district: true,
          experienceYears: true,
          desiredHourlyRate: true,
          workFields: true,
          declaredCredentials: true,
          profileImageUrl: true,
          bio: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  await prisma.contactViewLog.create({
    data: {
      viewerUserId: session.user.id,
      sosRequestId: id,
      reason: "SOS_APPLICATION_LIST",
    },
  })

  return NextResponse.json({ applications })
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const session = await getServerSession()
  if (!session?.user?.id || !session.user.role) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 })
  }
  if (session.user.role !== UserRole.COMPANY_OWNER && session.user.role !== UserRole.WORKER) {
    return NextResponse.json({ error: "업체 또는 경호 인력 계정만 신청할 수 있습니다." }, { status: 403 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "잘못된 요청 형식입니다." }, { status: 400 })
  }

  const sos = await prisma.sosRequest.findUnique({
    where: { id },
    include: {
      company: { select: { id: true, ownerId: true, name: true } },
    },
  })
  if (!sos) return NextResponse.json({ error: "존재하지 않는 SOS 요청입니다." }, { status: 404 })
  if (TERMINAL_SOS_STATUSES.includes(sos.status as (typeof TERMINAL_SOS_STATUSES)[number]) || sos.closedAt) {
    return NextResponse.json({ error: "마감된 SOS 요청입니다." }, { status: 409 })
  }
  if (sos.applicationDeadline && sos.applicationDeadline < new Date()) {
    return NextResponse.json({ error: "신청 마감 시간이 지났습니다." }, { status: 409 })
  }

  const now = new Date()
  const availableStartAt = readDate(body.availableStartAt)
  const availableEndAt = readDate(body.availableEndAt)
  if (availableStartAt && availableEndAt && availableEndAt <= availableStartAt) {
    return NextResponse.json({ error: "가능 종료 시간은 시작 시간보다 이후여야 합니다." }, { status: 400 })
  }

  const commonData = {
    sosRequestId: id,
    applicantUserId: session.user.id,
    status: SosApplicationStatus.NEW,
    availableStartAt,
    availableEndAt,
    proposedRate: readNumber(body.proposedRate),
    proposedTotal: readNumber(body.proposedTotal),
    contactName: readString(body.contactName, 80) ?? session.user.name ?? null,
    contactPhone: readString(body.contactPhone, 40),
    contactEmail: readString(body.contactEmail, 120),
    message: readString(body.message, 2000),
    introFileUrl: readString(body.introFileUrl, 500),
    experienceSummary: readString(body.experienceSummary, 2000),
    profileConsent: Boolean(body.profileConsent),
  }

  let createdApplicationId: string
  if (session.user.role === UserRole.COMPANY_OWNER) {
    if (!sos.allowCompanyApplicants) {
      return NextResponse.json({ error: "이 SOS 요청은 업체 지원을 받지 않습니다." }, { status: 403 })
    }
    const applicantCompany = await prisma.company.findUnique({
      where: { ownerId: session.user.id },
      select: { id: true, status: true, isActive: true, name: true, phone: true },
    })
    if (!applicantCompany || applicantCompany.status !== "APPROVED" || !applicantCompany.isActive) {
      return NextResponse.json({ error: "승인 완료된 업체만 신청할 수 있습니다." }, { status: 403 })
    }
    if (applicantCompany.id === sos.companyId) {
      return NextResponse.json({ error: "본인이 등록한 SOS 요청에는 신청할 수 없습니다." }, { status: 409 })
    }

    const availableHeadcount = readNumber(body.availableHeadcount)
    if (!availableHeadcount || availableHeadcount < 1) {
      return NextResponse.json({ error: "투입 가능 인원을 입력해 주세요." }, { status: 400 })
    }

    try {
      const result = await prisma.$transaction(async (tx) => {
        const app = await tx.sosApplication.create({
          data: {
            ...commonData,
            applicantType: "COMPANY",
            companyId: applicantCompany.id,
            availableHeadcount,
            contactPhone: commonData.contactPhone ?? applicantCompany.phone,
          },
          select: { id: true },
        })
        await tx.sosRequest.update({
          where: { id },
          data: { applicationCount: { increment: 1 } },
        })
        await tx.auditLog.create({
          data: {
            actorUserId: session.user.id,
            action: "SOS_APPLICATION_CREATE",
            targetType: "SOS_REQUEST",
            targetId: id,
            metadata: { applicantType: "COMPANY", createdAt: now.toISOString() } as Prisma.InputJsonValue,
          },
        })
        return app
      })
      createdApplicationId = result.id
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        return NextResponse.json({ error: "이미 이 SOS 요청에 신청했습니다." }, { status: 409 })
      }
      throw error
    }
  } else {
    if (!sos.allowGuardApplicants) {
      return NextResponse.json({ error: "이 SOS 요청은 개인 경호 인력 지원을 받지 않습니다." }, { status: 403 })
    }
    const workerProfile = await prisma.workerProfile.findUnique({
      where: { userId: session.user.id },
      select: {
        id: true,
        address: true,
        city: true,
        district: true,
        workFields: true,
        desiredHourlyRate: true,
      },
    })
    if (!workerProfile || !isWorkerProfileComplete(workerProfile)) {
      return NextResponse.json({ error: "프로필을 먼저 완성해야 SOS에 신청할 수 있습니다." }, { status: 403 })
    }

    try {
      const result = await prisma.$transaction(async (tx) => {
        const app = await tx.sosApplication.create({
          data: {
            ...commonData,
            applicantType: "GUARD",
            workerProfileId: workerProfile.id,
            availableHeadcount: 1,
            proposedRate: commonData.proposedRate ?? workerProfile.desiredHourlyRate,
          },
          select: { id: true },
        })
        await tx.sosRequest.update({
          where: { id },
          data: { applicationCount: { increment: 1 } },
        })
        await tx.auditLog.create({
          data: {
            actorUserId: session.user.id,
            action: "SOS_APPLICATION_CREATE",
            targetType: "SOS_REQUEST",
            targetId: id,
            metadata: { applicantType: "GUARD", createdAt: now.toISOString() } as Prisma.InputJsonValue,
          },
        })
        return app
      })
      createdApplicationId = result.id
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        return NextResponse.json({ error: "이미 이 SOS 요청에 신청했습니다." }, { status: 409 })
      }
      throw error
    }
  }

  await createNotifications([
    {
      userId: sos.company.ownerId,
      sosRequestId: id,
      type: "SOS_APPLICATION",
      title: "새 SOS 신청이 도착했습니다",
      body: `'${sos.title}' 요청에 새로운 신청이 접수되었습니다.`,
    },
  ])

  return NextResponse.json({ applicationId: createdApplicationId }, { status: 201 })
}
