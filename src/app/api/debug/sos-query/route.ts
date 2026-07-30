export const dynamic = 'force-dynamic'
import { getServerSession } from "@/lib/session"
import { prisma } from "@/lib/prisma"

// 임시 진단 엔드포인트 — /sos 페이지와 동일한 쿼리 테스트
export async function GET() {
  const results: Record<string, unknown> = {}

  // 1. getServerSession 테스트
  try {
    const session = await getServerSession()
    results.session = {
      hasSession: !!session,
      userId: session?.user?.id ? session.user.id.slice(0, 8) + "..." : null,
      role: session?.user?.role ?? null,
    }
  } catch (e) {
    results.session = { error: e instanceof Error ? e.message : String(e) }
  }

  // 2. notification.count 테스트 (더미 userId)
  try {
    const count = await prisma.notification.count({ where: { isRead: false } })
    results.notificationCount = count
  } catch (e) {
    results.notificationCount = { error: e instanceof Error ? e.message : String(e) }
  }

  // 3. SosRequest.findMany with _count 테스트
  try {
    const items = await prisma.sosRequest.findMany({
      where: { status: { notIn: ["CANCELLED", "COMPLETED"] } },
      include: {
        company: { select: { id: true, name: true } },
        _count: { select: { sosApplications: true, sosMatches: true } },
      },
      take: 1,
    })
    results.sosRequestQuery = { ok: true, count: items.length }
  } catch (e) {
    results.sosRequestQuery = { error: e instanceof Error ? e.message : String(e) }
  }

  // 4. sosApplication with applicantUserId 테스트
  try {
    const items = await prisma.sosRequest.findMany({
      where: { status: { notIn: ["CANCELLED", "COMPLETED"] } },
      include: {
        company: { select: { id: true, name: true } },
        sosApplications: {
          where: { applicantUserId: "test-nonexistent-id" },
          select: { id: true, status: true },
        },
        _count: { select: { sosApplications: true, sosMatches: true } },
      },
      take: 1,
    })
    results.fullSosQuery = { ok: true, count: items.length }
  } catch (e) {
    results.fullSosQuery = { error: e instanceof Error ? e.message : String(e) }
  }

  return Response.json(results)
}
