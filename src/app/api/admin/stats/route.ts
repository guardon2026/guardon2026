// GET /api/admin/stats — 플랫폼 운영 통계 집계 (ADMIN 전용)
import { NextResponse } from "next/server"
import { getServerSession } from "@/lib/session"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await getServerSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 })
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "관리자 권한이 필요합니다." }, { status: 403 })
  }

  const [
    totalCompanies,
    pendingCompanies,
    approvedCompanies,
    rejectedCompanies,
    totalWorkers,
    workersWithApprovedCredentials,
    totalSosRequests,
    completedSosRequests,
    unresolvedSosRequests,
    activeSosRequests,
  ] = await Promise.all([
    prisma.company.count(),
    prisma.company.count({ where: { status: "PENDING" } }),
    prisma.company.count({ where: { status: "APPROVED" } }),
    prisma.company.count({ where: { status: "REJECTED" } }),
    // PIPA soft-delete: deletedAt IS NULL 필터 필수
    prisma.workerProfile.count({
      where: { user: { deletedAt: null } },
    }),
    prisma.workerProfile.count({
      where: {
        user: { deletedAt: null },
        credentials: { some: { status: "APPROVED" } },
      },
    }),
    prisma.sosRequest.count(),
    prisma.sosRequest.count({ where: { status: "COMPLETED" } }),
    prisma.sosRequest.count({ where: { status: "UNRESOLVED" } }),
    prisma.sosRequest.count({
      where: { status: { in: ["DISPATCHING", "PENDING"] } },
    }),
  ])

  return NextResponse.json({
    totalCompanies,
    pendingCompanies,
    approvedCompanies,
    rejectedCompanies,
    totalWorkers,
    workersWithApprovedCredentials,
    totalSosRequests,
    completedSosRequests,
    unresolvedSosRequests,
    activeSosRequests,
  })
}
