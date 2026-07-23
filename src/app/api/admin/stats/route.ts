export const dynamic = 'force-dynamic'
// GET /api/admin/stats ???占쎈옯???占쎌쁺 ?占쎄퀎 吏묎퀎 (ADMIN ?占쎌슜)
import { NextResponse } from "next/server"
import { getServerSession } from "@/lib/session"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await getServerSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "?占쎌쬆???占쎌슂?占쎈땲??" }, { status: 401 })
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "愿由ъ옄 沅뚰븳???占쎌슂?占쎈땲??" }, { status: 403 })
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
    // PIPA soft-delete: deletedAt IS NULL ?占쏀꽣 ?占쎌닔
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
