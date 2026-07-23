export const dynamic = 'force-dynamic'
// GET /api/admin/stats ???åÎû´???¥ÏòÅ ?µÍ≥Ñ ÏßëÍ≥Ñ (ADMIN ?ÑÏö©)
import { NextResponse } from "next/server"
import { getServerSession } from "@/lib/session"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await getServerSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "?∏Ï¶ù???ÑÏöî?©Îãà??" }, { status: 401 })
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Í¥ÄÎ¶¨Ïûê Í∂åÌïú???ÑÏöî?©Îãà??" }, { status: 403 })
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
    // PIPA soft-delete: deletedAt IS NULL ?ÑÌÑ∞ ?ÑÏàò
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
