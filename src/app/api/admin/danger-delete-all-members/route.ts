export const dynamic = 'force-dynamic'
import { NextResponse } from "next/server"
import { getServerSession } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { UserRole } from "@prisma/client"

const CONFIRM_PHRASE = "DELETE_ALL_MEMBERS"

/**
 * 관리자 전용 — 관리자를 제외한 모든 회원(업체·경비 인력)과 연관 데이터를 물리적으로
 * 영구 삭제한다. FK 제약을 피하기 위해 자식 테이블부터 역순으로 삭제한다.
 * 되돌릴 수 없음 — 소프트 삭제(회원 탈퇴, /api/auth/withdraw)와는 별개의 파괴적 작업.
 */
export async function POST(req: Request) {
  const session = await getServerSession()
  if (!session?.user?.id || session.user.role !== UserRole.ADMIN) {
    return NextResponse.json({ error: "관리자만 사용할 수 있습니다." }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  if (body?.confirm !== CONFIRM_PHRASE) {
    return NextResponse.json(
      { error: `요청 본문에 { confirm: "${CONFIRM_PHRASE}" }를 정확히 포함해야 합니다.` },
      { status: 400 }
    )
  }

  const result = await prisma.$transaction(async (tx) => {
    const nonAdminUsers = await tx.user.findMany({
      where: { role: { not: UserRole.ADMIN } },
      select: { id: true },
    })
    const userIds = nonAdminUsers.map((u) => u.id)
    if (userIds.length === 0) {
      return { deletedUsers: 0 }
    }

    const [ratings, workContracts] = await Promise.all([
      tx.rating.deleteMany({}),
      tx.workContract.deleteMany({}),
    ])
    const contactViewLogs = await tx.contactViewLog.deleteMany({})
    const sosApplications = await tx.sosApplication.deleteMany({})
    const sosMatches = await tx.sosMatch.deleteMany({})
    const notifications = await tx.notification.deleteMany({
      where: { userId: { in: userIds } },
    })
    const sosRequests = await tx.sosRequest.deleteMany({})
    const reports = await tx.report.deleteMany({
      where: { reporterUserId: { in: userIds } },
    })
    await tx.auditLog.updateMany({
      where: { actorUserId: { in: userIds } },
      data: { actorUserId: null },
    })
    const consentLogs = await tx.consentLog.deleteMany({
      where: { userId: { in: userIds } },
    })
    const [companyDocuments, subscriptions, credentials, guardProjects] = await Promise.all([
      tx.companyDocument.deleteMany({}),
      tx.subscription.deleteMany({}),
      tx.credential.deleteMany({}),
      tx.guardProject.deleteMany({}),
    ])
    const companies = await tx.company.deleteMany({})
    const workerProfiles = await tx.workerProfile.deleteMany({})
    const users = await tx.user.deleteMany({
      where: { id: { in: userIds } },
    })

    return {
      deletedUsers: users.count,
      deletedCompanies: companies.count,
      deletedWorkerProfiles: workerProfiles.count,
      deletedSosRequests: sosRequests.count,
      deletedSosMatches: sosMatches.count,
      deletedSosApplications: sosApplications.count,
      deletedWorkContracts: workContracts.count,
      deletedRatings: ratings.count,
      deletedNotifications: notifications.count,
      deletedReports: reports.count,
      deletedConsentLogs: consentLogs.count,
      deletedContactViewLogs: contactViewLogs.count,
      deletedCompanyDocuments: companyDocuments.count,
      deletedSubscriptions: subscriptions.count,
      deletedCredentials: credentials.count,
      deletedGuardProjects: guardProjects.count,
    }
  })

  return NextResponse.json({ ok: true, ...result })
}
