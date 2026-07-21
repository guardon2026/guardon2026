import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET /api/sos/stats/avg-daily-rate
// 지난 달 완료된 SOS 요청의 평균 일급 반환
export async function GET() {
  const now = new Date()
  const firstOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const firstOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)

  const result = await prisma.sosRequest.aggregate({
    _avg: { hourlyRate: true },
    _count: { hourlyRate: true },
    where: {
      createdAt: {
        gte: firstOfLastMonth,
        lt: firstOfThisMonth,
      },
      hourlyRate: { gt: 0 },
    },
  })

  const avg = result._avg.hourlyRate
  const count = result._count.hourlyRate

  return NextResponse.json({
    avgDailyRate: avg ? Math.round(avg) : null,
    count,
  })
}
