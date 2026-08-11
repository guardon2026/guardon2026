import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "@/lib/session"
import { UserRole } from "@prisma/client"
import { calcDailyTax } from "@/lib/tax"
import TaxReportExport from "./TaxReportExport"

interface Props {
  params: Promise<{ id: string }>
}

interface ScheduleDay {
  date: string
  endDate?: string
  startTime?: string
  endTime?: string
  requiredCount?: number
}

function parseDays(raw: unknown): ScheduleDay[] {
  if (!Array.isArray(raw)) return []
  return raw.filter(
    (d): d is ScheduleDay => d && typeof d === "object" && typeof (d as ScheduleDay).date === "string"
  )
}

function formatBirth(raw: string | null): string {
  if (!raw || raw.length < 6) return raw ?? "-"
  return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8) || "**"}`
}

function calcWorkHours(day: ScheduleDay): number {
  if (!day.startTime || !day.endTime) return 8
  const baseDate = day.date
  const start = new Date(`${baseDate}T${day.startTime}`)
  const end = new Date(`${day.endDate ?? baseDate}T${day.endTime}`)
  return Math.max(0, (end.getTime() - start.getTime()) / (1000 * 60 * 60))
}

const URGENCY_FEE: Record<string, number> = { NORMAL: 0, FAST: 5_000, URGENT: 10_000, CRITICAL: 15_000 }

export default async function TaxReportPage({ params }: Props) {
  const { id } = await params
  const session = await getServerSession()
  if (!session?.user?.id) redirect("/login")
  if (session.user.role !== UserRole.COMPANY_OWNER) redirect("/")

  const company = await prisma.company.findUnique({
    where: { ownerId: session.user.id },
    select: {
      id: true,
      name: true,
      businessRegistrationNumber: true,
      address: true,
      owner: { select: { name: true } },
    },
  })
  if (!company) redirect("/register")

  const sos = await prisma.sosRequest.findUnique({
    where: { id },
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
  if (!sos || sos.companyId !== company.id) notFound()

  const confirmedMatches = await prisma.sosMatch.findMany({
    where: { sosRequestId: id, status: "CONFIRMED" },
    include: {
      workerProfile: { include: { user: { select: { name: true, phone: true } } } },
      workContract: true,
    },
    orderBy: { confirmedAt: "asc" },
  })

  const scheduleDays = parseDays(sos.scheduleDays)
  const urgencyBonus = URGENCY_FEE[sos.urgencyLevel ?? "NORMAL"] ?? 0
  const effectiveDailyRate = sos.hourlyRate + urgencyBonus
  const taxInfo = calcDailyTax(effectiveDailyRate)

  // 날짜별 근무시간 계산
  const dayDetails = scheduleDays.map((d) => ({
    date: d.date,
    hours: calcWorkHours(d),
    requiredCount: d.requiredCount ?? 1,
    startTime: d.startTime ?? "-",
    endTime: d.endTime ?? "-",
  }))

  // 근로자별로 그룹핑 — 매치가 날짜당 1행이므로 한 근로자가 여러 날짜를 확정했으면
  // confirmedMatches에 여러 행으로 들어온다. 근로자별 실제 확정 근무일수 기준으로 집계한다.
  const workerGroups = Array.from(
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
  ).map((g) => {
    const workDates = g.matches.map((m) => m.scheduleDate).sort()
    const primary = g.matches[0]
    const contract = primary.workContract
    return {
      ...g,
      workDates,
      workingDays: workDates.length,
      contract,
      allSigned: g.matches.every((m) => m.workContract?.employerSignedAt && m.workContract?.workerSignedAt),
    }
  })

  // CSV export용 근로자 데이터
  const exportWorkers = workerGroups.map((g) => ({
    name: g.workerName,
    birthDate: formatBirth(g.contract?.workerBirthDate ?? null),
    phone: g.contract?.workerPhone ?? g.matches[0].workerProfile.user.phone ?? "-",
    workDates: g.workDates,
    dailyRate: effectiveDailyRate,
    incomeTax: taxInfo.incomeTax,
    localTax: taxInfo.localTax,
    netPay: taxInfo.netPay,
  }))

  return (
    <div className="max-w-4xl mx-auto space-y-6 print:space-y-4">

      {/* 헤더 */}
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-3">
          <Link href={`/sos/${id}`} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-base font-bold text-gray-900">신고 정보</h1>
            <p className="text-xs text-gray-400 mt-0.5">{sos.title}</p>
          </div>
        </div>
        <TaxReportExport
          sosTitle={sos.title}
          employerName={company.name}
          employerBizNumber={company.businessRegistrationNumber ?? ""}
          workers={exportWorkers}
        />
      </div>

      {/* 인쇄 타이틀 */}
      <div className="hidden print:block text-center space-y-1 pb-4 border-b">
        <h1 className="text-xl font-bold">일용근로자 원천징수 및 노무 신고 자료</h1>
        <p className="text-sm text-gray-600">{sos.title}</p>
        <p className="text-xs text-gray-400">출력일: {new Date().toLocaleDateString("ko-KR")}</p>
      </div>

      {/* 주의 안내 */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 text-sm text-amber-800 print:border print:rounded-none">
        <p className="font-semibold mb-1">⚠️ 신고 전 확인 사항</p>
        <ul className="text-xs space-y-0.5 list-disc list-inside text-amber-700">
          <li>원천징수 신고(지급명세서)는 지급일이 속한 달의 다음 달 말일까지 국세청 홈택스에 제출하세요.</li>
          <li>일용근로자 고용보험 취득신고는 근로 개시일로부터 14일 이내에 근로복지공단에 제출하세요.</li>
          <li>주민등록번호는 시스템에서 수집하지 않으므로, 신고 시 근로자에게 직접 확인하세요.</li>
          <li>일급 150,000원 이하는 소득세 비과세 구간입니다.</li>
        </ul>
      </div>

      {/* 지급자(업체) 정보 */}
      <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-3 print:shadow-none print:border">
        <h2 className="text-sm font-bold text-gray-700 pb-2 border-b border-gray-100">지급자(사업주) 정보</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <InfoBlock label="업체명" value={company.name} />
          <InfoBlock label="사업자번호" value={company.businessRegistrationNumber ?? "미등록"} />
          <InfoBlock label="대표자명" value={company.owner.name ?? "-"} />
          <InfoBlock label="사업장 주소" value={company.address} />
        </div>
      </section>

      {/* 배치 일정 */}
      {dayDetails.length > 0 && (
        <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-3 print:shadow-none print:border">
          <h2 className="text-sm font-bold text-gray-700 pb-2 border-b border-gray-100">배치 일정 및 근무 시간</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="text-xs text-gray-400 border-b border-gray-100">
                  <th className="py-2 pr-4 font-medium">날짜</th>
                  <th className="py-2 pr-4 font-medium">근무 시간</th>
                  <th className="py-2 pr-4 font-medium">근무 시수</th>
                  <th className="py-2 font-medium">필요 인원</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {dayDetails.map((d, i) => (
                  <tr key={i} className="text-gray-700">
                    <td className="py-2 pr-4 font-medium">{d.date}</td>
                    <td className="py-2 pr-4">{d.startTime} ~ {d.endTime}</td>
                    <td className="py-2 pr-4">{d.hours.toFixed(1)}시간</td>
                    <td className="py-2">{d.requiredCount}명</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* 근로자별 원천징수 내역 */}
      <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4 print:shadow-none print:border">
        <h2 className="text-sm font-bold text-gray-700 pb-2 border-b border-gray-100">
          근로자별 원천징수 내역 ({workerGroups.length}명)
        </h2>

        {workerGroups.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">확정된 근로자가 없습니다.</p>
        ) : (
          <div className="space-y-4">
            {workerGroups.map((g) => {
              const contract = g.contract
              const birthDate  = formatBirth(contract?.workerBirthDate ?? null)
              const phone      = contract?.workerPhone ?? g.matches[0].workerProfile.user.phone ?? "-"
              const address    = contract?.workerAddress ?? "-"
              const bankName   = contract?.workerBankName ?? "-"
              const accountNum = contract?.workerAccountNum ?? "-"
              const accountHolder = contract?.workerAccountHolder ?? "-"

              const totalGross = effectiveDailyRate * g.workingDays
              const totalIncomeTax = taxInfo.incomeTax * g.workingDays
              const totalLocalTax  = taxInfo.localTax  * g.workingDays
              const totalNet       = taxInfo.netPay    * g.workingDays

              return (
                <div key={g.workerProfileId} className="rounded-xl border border-gray-100 overflow-hidden">
                  {/* 근로자 헤더 */}
                  <div className="bg-gray-50 px-5 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-gray-900">{g.workerName}</span>
                      <span className="text-xs text-gray-500">{g.workDates.join(", ")}</span>
                      {g.allSigned
                        ? <span className="text-xs text-green-600 font-medium">✅ 계약서 서명 완료</span>
                        : <span className="text-xs text-amber-600 font-medium">⚠️ 계약서 미서명</span>
                      }
                    </div>
                    <div className="flex gap-2">
                      {g.matches.map((m) => (
                        <Link
                          key={m.id}
                          href={`/sos/${id}/contract/${m.id}`}
                          className="text-xs text-brand underline hover:text-blue-700"
                        >
                          {m.scheduleDate} 계약서
                        </Link>
                      ))}
                    </div>
                  </div>

                  <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
                    {/* 근로자 기본 정보 */}
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">기본 정보</p>
                      <InfoRow label="성명" value={g.workerName} />
                      <InfoRow label="생년월일" value={birthDate} />
                      <InfoRow label="주민번호" value="직접 확인 필요" muted />
                      <InfoRow label="연락처" value={phone} />
                      <InfoRow label="주소" value={address} />
                    </div>

                    {/* 정산 계좌 */}
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">정산 계좌</p>
                      <InfoRow label="은행명" value={bankName} />
                      <InfoRow label="계좌번호" value={accountNum} />
                      <InfoRow label="예금주" value={accountHolder} />
                    </div>

                    {/* 원천징수 계산 */}
                    <div className="sm:col-span-2 mt-2 pt-3 border-t border-gray-100 space-y-2">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                        원천징수 계산 (확정 {g.workingDays}일 × {effectiveDailyRate.toLocaleString()}원)
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                        <TaxBlock label="세전 총지급액" value={`${totalGross.toLocaleString()}원`} />
                        <TaxBlock label={`소득세 (일당 ${taxInfo.incomeTax.toLocaleString()}원)`} value={`- ${totalIncomeTax.toLocaleString()}원`} sub />
                        <TaxBlock label={`지방소득세 (일당 ${taxInfo.localTax.toLocaleString()}원)`} value={`- ${totalLocalTax.toLocaleString()}원`} sub />
                        <TaxBlock label="총 세액" value={`- ${(totalIncomeTax + totalLocalTax).toLocaleString()}원`} sub />
                        <TaxBlock label="차인지급액(세후)" value={`${totalNet.toLocaleString()}원`} highlight />
                      </div>
                      {taxInfo.taxBracket === "EXEMPT" && (
                        <p className="text-xs text-green-600">※ 일급 {effectiveDailyRate.toLocaleString()}원은 150,000원 이하 비과세 구간입니다.</p>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* 전체 합계 */}
      {workerGroups.length > 0 && (
        <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 print:shadow-none print:border">
          <h2 className="text-sm font-bold text-gray-700 pb-2 border-b border-gray-100 mb-4">전체 지급 합계</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <TaxBlock label="총 근로자 수" value={`${workerGroups.length}명`} />
            <TaxBlock label="세전 총지급액" value={`${workerGroups.reduce((s, g) => s + effectiveDailyRate * g.workingDays, 0).toLocaleString()}원`} />
            <TaxBlock label="총 원천징수액" value={`${workerGroups.reduce((s, g) => s + (taxInfo.incomeTax + taxInfo.localTax) * g.workingDays, 0).toLocaleString()}원`} sub />
            <TaxBlock label="총 차인지급액" value={`${workerGroups.reduce((s, g) => s + taxInfo.netPay * g.workingDays, 0).toLocaleString()}원`} highlight />
          </div>
        </section>
      )}

      {/* 고용보험 신고 안내 */}
      <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-3 print:shadow-none print:border">
        <h2 className="text-sm font-bold text-gray-700 pb-2 border-b border-gray-100">고용보험 · 산재보험 신고 안내</h2>
        <div className="text-sm text-gray-600 space-y-2">
          <p>· <strong>일용근로자 고용보험 취득신고</strong>: 근로 개시일로부터 <strong>14일 이내</strong> 근로복지공단 또는 고용보험 EDI 신고</p>
          <p>· <strong>산재보험</strong>: 일용근로자도 자동 적용, 별도 취득신고 불필요 (보험료는 사업주 전액 부담)</p>
          <p>· <strong>신고 기관</strong>: 근로복지공단 (☎ 1588-0075), 고용보험 EDI (www.ei.go.kr)</p>
        </div>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="text-xs text-gray-400 border-b border-gray-100">
                <th className="py-2 pr-4 font-medium">성명</th>
                <th className="py-2 pr-4 font-medium">생년월일</th>
                <th className="py-2 pr-4 font-medium">근무 기간</th>
                <th className="py-2 font-medium">일 근무시간</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {workerGroups.map((g) => {
                const birth = formatBirth(g.contract?.workerBirthDate ?? null)
                const firstDate = g.workDates[0] ?? "-"
                const lastDate  = g.workDates[g.workDates.length - 1] ?? firstDate
                const workerDayDetails = dayDetails.filter((d) => g.workDates.includes(d.date))
                const avgHours = workerDayDetails.length > 0
                  ? (workerDayDetails.reduce((s, d) => s + d.hours, 0) / workerDayDetails.length).toFixed(1)
                  : "8.0"
                return (
                  <tr key={g.workerProfileId} className="text-gray-700">
                    <td className="py-2 pr-4 font-medium">{g.workerName}</td>
                    <td className="py-2 pr-4">{birth}</td>
                    <td className="py-2 pr-4">{firstDate} ~ {lastDate}</td>
                    <td className="py-2">{avgHours}시간</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

    </div>
  )
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-sm font-medium text-gray-800 mt-0.5">{value}</p>
    </div>
  )
}

function InfoRow({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex gap-3 text-sm">
      <span className="text-gray-400 w-20 shrink-0 text-xs">{label}</span>
      <span className={muted ? "text-gray-400 text-xs italic" : "text-gray-800 font-medium text-xs"}>{value}</span>
    </div>
  )
}

function TaxBlock({ label, value, sub, highlight }: { label: string; value: string; sub?: boolean; highlight?: boolean }) {
  return (
    <div className={`rounded-lg px-3 py-2.5 ${highlight ? "bg-blue-50 border border-blue-100" : sub ? "bg-red-50" : "bg-gray-50"}`}>
      <p className="text-xs text-gray-400">{label}</p>
      <p className={`text-sm font-bold mt-0.5 ${highlight ? "text-blue-700" : sub ? "text-red-600" : "text-gray-800"}`}>{value}</p>
    </div>
  )
}
