import { prisma } from "@/lib/prisma"
import { calcDailyTax, calcInsuredDailyTax } from "@/lib/tax"
import { extractDays, calcDayHours, getMonthlyWorkStats } from "@/lib/sos-matcher"
import { decryptPii, formatRrnDisplay } from "@/lib/crypto"

const URGENCY_FEE: Record<string, number> = { NORMAL: 0, FAST: 5_000, URGENT: 10_000, CRITICAL: 15_000 }

export function formatBirth(raw: string | null): string {
  if (!raw || raw.length < 6) return raw ?? "-"
  return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8) || "**"}`
}

/**
 * 특정 SOS 요청의 확정 인력을 근로자 단위로 그룹핑하여 원천징수·노무 신고에
 * 필요한 데이터를 계산한다. tax-report 페이지와 근로내용확인신고 엑셀 export가
 * 공유하는 집계 로직.
 */
export async function getSosLaborReport(sosId: string, companyId: string) {
  const sos = await prisma.sosRequest.findUnique({
    where: { id: sosId },
    select: {
      id: true,
      title: true,
      companyId: true,
      scheduleDays: true,
      scheduledAt: true,
      scheduledEndAt: true,
      hourlyRate: true,
      urgencyLevel: true,
    },
  })
  if (!sos || sos.companyId !== companyId) return null

  const confirmedMatches = await prisma.sosMatch.findMany({
    where: { sosRequestId: sosId, status: "CONFIRMED" },
    include: {
      workerProfile: { include: { user: { select: { name: true, phone: true } } } },
      workContract: true,
    },
    orderBy: { confirmedAt: "asc" },
  })

  function resolveRrn(encrypted: string | null): { display: string | null; raw: string | null } {
    if (!encrypted) return { display: null, raw: null }
    try {
      const raw = decryptPii(encrypted)
      return { display: formatRrnDisplay(raw), raw }
    } catch {
      return { display: null, raw: null }
    }
  }

  const scheduleDays = extractDays(sos.scheduleDays) ?? []
  const urgencyBonus = URGENCY_FEE[sos.urgencyLevel ?? "NORMAL"] ?? 0
  const effectiveDailyRate = sos.hourlyRate + urgencyBonus

  // 날짜별 근무시간 계산
  const dayDetails = scheduleDays.map((d) => ({
    date: d.date,
    hours: calcDayHours(d),
    requiredCount: d.requiredCount ?? 1,
    startTime: d.startTime ?? "-",
    endTime: d.endTime ?? "-",
  }))

  // 근로자별로 그룹핑 — 매치가 날짜당 1행이므로 한 근로자가 여러 날짜를 확정했으면
  // confirmedMatches에 여러 행으로 들어온다. 날짜별로 일용직/4대보험 대상이 다를 수 있으므로
  // 날짜(매치)별로 세금·보험료를 각각 계산한 뒤 근로자 단위로 합산한다.
  const workerGroups = await Promise.all(Array.from(
    confirmedMatches
      .reduce((map, m) => {
        const key = m.workerProfileId
        const existing = map.get(key)
        if (existing) {
          existing.matches.push(m)
        } else {
          map.set(key, {
            workerProfileId: key,
            workerName: m.workContract?.workerRealName ?? m.workerProfile.user.name ?? "-",
            matches: [m],
          })
        }
        return map
      }, new Map<string, { workerProfileId: string; workerName: string; matches: typeof confirmedMatches }>())
      .values()
  ).map(async (g) => {
    const sortedMatches = [...g.matches].sort((a, b) => a.scheduleDate.localeCompare(b.scheduleDate))
    const workDates = sortedMatches.map((m) => m.scheduleDate)

    // 이 근로자가 이번 SOS 근무일이 속한 달(들)에 이 업체와 실제로 얼마나 누적 근무했는지
    // (4대보험 가입 대상 판정 기준 = 월 8일 또는 60시간) — 분류가 맞는지 회사가 직접 확인할 수 있도록 표시
    const monthsInvolved = Array.from(new Set(workDates.map((d) => d.slice(0, 7))))
    const monthlyStats = await Promise.all(
      monthsInvolved.map(async (ym) => {
        const [y, mo] = ym.split("-").map(Number)
        const monthStartStr = `${ym}-01`
        const monthEndDate = new Date(y, mo, 0)
        const monthEndStr = `${monthEndDate.getFullYear()}-${String(monthEndDate.getMonth() + 1).padStart(2, "0")}-${String(monthEndDate.getDate()).padStart(2, "0")}`
        const stats = await getMonthlyWorkStats(g.workerProfileId, sos.companyId, monthStartStr, monthEndStr)
        return { month: ym, ...stats, meetsThreshold: stats.days >= 8 || stats.hours >= 60 }
      })
    )

    const matchBreakdown = sortedMatches.map((m) => {
      const insured = m.insuranceStatus === "INSURED"
      const t = insured ? calcInsuredDailyTax(effectiveDailyRate) : calcDailyTax(effectiveDailyRate)
      return {
        scheduleDate: m.scheduleDate,
        insured,
        incomeTax: t.incomeTax,
        localTax: t.localTax,
        pension: insured ? (t as ReturnType<typeof calcInsuredDailyTax>).pension : 0,
        health: insured ? (t as ReturnType<typeof calcInsuredDailyTax>).health : 0,
        employmentInsurance: t.employmentInsurance,
        netPay: t.netPay,
      }
    })
    const primary = g.matches[0]
    const contract = primary.workContract
    const { display: rrn, raw: rrnRaw } = resolveRrn(primary.workerProfile.rrn)
    const insuredDates = matchBreakdown.filter((d) => d.insured).map((d) => d.scheduleDate)
    return {
      ...g,
      workDates,
      workingDays: workDates.length,
      contract,
      rrn,
      rrnRaw,
      phone: contract?.workerPhone ?? primary.workerProfile.user.phone ?? null,
      matchBreakdown,
      insuredDates,
      monthlyStats,
      allSigned: g.matches.every((m) => m.workContract?.employerSignedAt && m.workContract?.workerSignedAt),
      totalGross: effectiveDailyRate * workDates.length,
      totalIncomeTax: matchBreakdown.reduce((s, d) => s + d.incomeTax, 0),
      totalLocalTax: matchBreakdown.reduce((s, d) => s + d.localTax, 0),
      totalPension: matchBreakdown.reduce((s, d) => s + d.pension, 0),
      totalHealth: matchBreakdown.reduce((s, d) => s + d.health, 0),
      totalEmploymentInsurance: matchBreakdown.reduce((s, d) => s + d.employmentInsurance, 0),
      totalNet: matchBreakdown.reduce((s, d) => s + d.netPay, 0),
    }
  }))

  return { sos, effectiveDailyRate, scheduleDays, dayDetails, workerGroups }
}

export type SosLaborReport = NonNullable<Awaited<ReturnType<typeof getSosLaborReport>>>
export type LaborWorkerGroup = SosLaborReport["workerGroups"][number]
