import { notFound, redirect } from "next/navigation"
import { ArrowLeft, MapPin, Users, Zap, Shirt, FileText, Phone, Wallet } from "lucide-react"
import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "@/lib/session"
import { UserRole, SosMatchStatus } from "@prisma/client"
import { PageHeader } from "@/components/ui/page-header"
import { StatusBadge } from "@/components/ui/status-badge"
import { WORK_FIELD_LABELS, CREDENTIAL_LABELS, DRESS_CODE_LABELS } from "@/lib/constants"
import type { StatusVariant } from "@/components/ui/status-badge"
import WorkerMatchActions from "./WorkerMatchActions"
import { calcDailyTax, calcInsuredDailyTax, HIGH_RATE_THRESHOLD } from "@/lib/tax"
import { ScheduleDayList } from "@/components/sos/ScheduleDayList"

interface Props {
  params: Promise<{ id: string }>
}

function matchStatusVariant(status: SosMatchStatus): StatusVariant {
  switch (status) {
    case "NOTIFIED":  return "pending"
    case "ACCEPTED":  return "active"
    case "REJECTED":  return "rejected"
    case "CONFIRMED": return "confirmed"
    default:          return "unresolved"
  }
}

const MATCH_STATUS_LABELS: Record<SosMatchStatus, string> = {
  NOTIFIED:  "대기 중",
  ACCEPTED:  "수락함",
  REJECTED:  "거절함",
  CONFIRMED: "확정됨",
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
}) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
      <div>
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-sm font-medium text-gray-900 mt-0.5">{value}</p>
      </div>
    </div>
  )
}

export default async function WorkerSosDetailPage({ params }: Props) {
  const { id } = await params

  const session = await getServerSession()
  if (!session?.user?.id) redirect("/login")
  if (session.user.role !== UserRole.WORKER) redirect("/")

  const workerProfile = await prisma.workerProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  })
  if (!workerProfile) redirect("/profile/edit")

  // 이 워커의 이 요청 내 날짜별 매치 전체 (다일 근무는 날짜당 1행)
  const matches = await prisma.sosMatch.findMany({
    where: { sosRequestId: id, workerProfileId: workerProfile.id },
    select: { id: true, status: true, scheduleDate: true, insuranceStatus: true },
    orderBy: { scheduleDate: "asc" },
  })
  if (matches.length === 0) notFound()

  const sos = await prisma.sosRequest.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      status: true,
      locationAddress: true,
      scheduledAt: true,
      scheduledEndAt: true,
      scheduleDays: true,
      requiredCount: true,
      hourlyRate: true,
      urgencyLevel: true,
      requiredFields: true,
      requiredCredentials: true,
      dressCode: true,
      dressCodeNote: true,
      description: true,
      siteManagerContact: true,
    },
  })
  if (!sos) notFound()

  const matchByDate = new Map(matches.map((m) => [m.scheduleDate, m]))
  const isAccepted = matches.some(
    (m) => m.status === SosMatchStatus.ACCEPTED || m.status === SosMatchStatus.CONFIRMED
  )
  const pendingCount = matches.filter((m) => m.status === SosMatchStatus.NOTIFIED).length
  const anyInsured = matches.some((m) => m.insuranceStatus === "INSURED")
  const URGENCY_FEE: Record<string, number> = { NORMAL: 0, FAST: 5_000, URGENT: 10_000, CRITICAL: 15_000 }
  const urgencyBonus = URGENCY_FEE[sos.urgencyLevel ?? "NORMAL"] ?? 0
  const effectiveDailyRate = sos.hourlyRate + urgencyBonus  // 긴급도 추가 포함 실제 일급
  const taxInfo = anyInsured ? calcInsuredDailyTax(effectiveDailyRate) : calcDailyTax(effectiveDailyRate)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-5">

        <PageHeader
          title={sos.title}
          subtitle="SOS 긴급 요청 상세"
          action={
            matches.length > 1 ? (
              <StatusBadge
                variant={pendingCount > 0 ? "pending" : "active"}
                label={pendingCount > 0 ? `${pendingCount}일 응답 대기` : "전체 응답 완료"}
              />
            ) : (
              <StatusBadge
                variant={matchStatusVariant(matches[0].status)}
                label={MATCH_STATUS_LABELS[matches[0].status]}
              />
            )
          }
        />

        {/* 원천징수 후 실수령 예상 안내 카드 */}
        <div className={`rounded-2xl border p-5 space-y-3 ${
          taxInfo.taxBracket === "EXEMPT"
            ? "bg-green-50 border-green-200"
            : "bg-blue-50 border-blue-200"
        }`}>
          <div className="flex items-center gap-2">
            <Wallet className={`w-4 h-4 ${taxInfo.taxBracket === "EXEMPT" ? "text-green-600" : "text-blue-600"}`} />
            <p className={`text-xs font-semibold uppercase tracking-wide ${
              taxInfo.taxBracket === "EXEMPT" ? "text-green-700" : "text-blue-700"
            }`}>
              원천징수 후 세후 실수령 예상액 (1일 기준)
            </p>
          </div>
          {anyInsured && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              이번 달 이 업체와의 누적 근무가 8일 또는 60시간을 넘어 국민연금·건강보험 가입
              대상으로 전환되었습니다. 아래 금액에는 4대보험 근로자 부담분이 반영되어 있습니다.
            </p>
          )}
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">일급 (세전)</span>
              <span className="font-semibold text-gray-900">{effectiveDailyRate.toLocaleString()}원
                {urgencyBonus > 0 && (
                  <span className="text-xs font-normal text-amber-600 ml-1">
                    (기본 {sos.hourlyRate.toLocaleString()}원 + 긴급도 {urgencyBonus.toLocaleString()}원)
                  </span>
                )}
              </span>
            </div>
            {taxInfo.taxBracket === "TAXED" ? (
              <>
                <div className="flex justify-between text-gray-500">
                  <span>소득세 원천징수</span>
                  <span>- {taxInfo.incomeTax.toLocaleString()}원</span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>지방소득세</span>
                  <span>- {taxInfo.localTax.toLocaleString()}원</span>
                </div>
                {anyInsured && (
                  <>
                    <div className="flex justify-between text-gray-500">
                      <span>국민연금 (근로자 4.5%)</span>
                      <span>- {(taxInfo as ReturnType<typeof calcInsuredDailyTax>).pension.toLocaleString()}원</span>
                    </div>
                    <div className="flex justify-between text-gray-500">
                      <span>건강보험 (근로자 약 3.545%)</span>
                      <span>- {(taxInfo as ReturnType<typeof calcInsuredDailyTax>).health.toLocaleString()}원</span>
                    </div>
                    <div className="flex justify-between text-gray-500">
                      <span>고용보험 (근로자 0.9%)</span>
                      <span>- {(taxInfo as ReturnType<typeof calcInsuredDailyTax>).employmentInsurance.toLocaleString()}원</span>
                    </div>
                  </>
                )}
                <div className={`flex justify-between border-t pt-1.5 font-bold ${
                  effectiveDailyRate >= HIGH_RATE_THRESHOLD ? "border-blue-200 text-blue-800" : "border-gray-200 text-gray-900"
                }`}>
                  <span>세후 실수령액</span>
                  <span>{taxInfo.netPay.toLocaleString()}원</span>
                </div>
                <p className="text-xs text-blue-600 mt-1">
                  경비 업체가 프로젝트 완료 후 원천징수를 수행하며, 14일 이내 계좌이체로 정산됩니다.
                </p>
              </>
            ) : (
              <>
                <div className={`flex justify-between border-t pt-1.5 font-bold border-green-200 text-green-800`}>
                  <span>세후 실수령액</span>
                  <span>{taxInfo.netPay.toLocaleString()}원 (세금 없음)</span>
                </div>
                <p className="text-xs text-green-600 mt-1">
                  일급 150,000원 이하는 일용근로소득세 비과세 구간입니다. 프로젝트 완료 후 14일 이내 계좌이체로 정산됩니다.
                </p>
              </>
            )}
          </div>
        </div>

        {/* 기본 정보 */}
        <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6 space-y-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">요청 정보</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InfoRow icon={MapPin} label="집결지" value={sos.locationAddress} />
            <InfoRow icon={Zap} label="일급 (세전)" value={urgencyBonus > 0 ? `${effectiveDailyRate.toLocaleString()}원/일` : `${sos.hourlyRate.toLocaleString()}원/일`} />
            <InfoRow icon={Users} label="필요 인원" value={`총 ${sos.requiredCount}명`} />
            {sos.dressCode && (
              <InfoRow
                icon={Shirt}
                label="복장 규정"
                value={DRESS_CODE_LABELS[sos.dressCode] ?? sos.dressCode}
              />
            )}
          </div>

          {sos.requiredFields.length > 0 && (
            <div>
              <p className="text-xs text-gray-400 mb-1.5">업무 분야</p>
              <div className="flex flex-wrap gap-1.5">
                {sos.requiredFields.map((f) => (
                  <span key={f} className="px-2.5 py-1 bg-blue-50 text-brand text-xs font-medium rounded-full">
                    {WORK_FIELD_LABELS[f] ?? f}
                  </span>
                ))}
              </div>
            </div>
          )}

          {sos.requiredCredentials.length > 0 && (
            <div>
              <p className="text-xs text-gray-400 mb-1.5">필요 자격증</p>
              <div className="flex flex-wrap gap-1.5">
                {sos.requiredCredentials.map((c) => (
                  <span key={c} className="px-2.5 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
                    {CREDENTIAL_LABELS[c] ?? c}
                  </span>
                ))}
              </div>
            </div>
          )}

          {sos.description && (
            <div className="flex items-start gap-2.5">
              <FileText className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-gray-400">추가 설명</p>
                <p className="text-sm text-gray-700 mt-0.5 whitespace-pre-line">{sos.description}</p>
              </div>
            </div>
          )}
        </div>

        {/* 배치 일정 — 날짜별로 개별 수락/거절 가능 */}
        <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6 space-y-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">배치 일정</p>
          {matches.length > 1 && (
            <p className="text-xs text-gray-500">날짜별로 개별 수락·거절할 수 있습니다.</p>
          )}

          <ScheduleDayList
            scheduleDays={sos.scheduleDays}
            scheduledAt={sos.scheduledAt}
            scheduledEndAt={sos.scheduledEndAt}
            renderDayAction={(day) => {
              const m = matchByDate.get(day.date)
              if (!m) return null
              if (m.status === SosMatchStatus.NOTIFIED) {
                return <WorkerMatchActions matchId={m.id} compact />
              }
              return (
                <StatusBadge variant={matchStatusVariant(m.status)} label={MATCH_STATUS_LABELS[m.status]} />
              )
            }}
          />
        </div>

        {/* 현장 담당자 연락처 — 하루라도 수락/확정 후에만 표시 */}
        {isAccepted && sos.siteManagerContact && (
          <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6 space-y-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">현장 담당자 연락처</p>
            <div className="space-y-1.5">
              {sos.siteManagerContact.split("\n").map((line, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-gray-900">
                  <Phone className="w-4 h-4 text-gray-400 shrink-0" />
                  <span className="font-medium">{line}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <Link
            href="/notifications"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-gray-200
                       text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            알림 목록으로
          </Link>
        </div>
      </div>
    </div>
  )
}
