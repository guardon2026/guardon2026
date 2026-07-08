import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, MapPin, Calendar, Users, Briefcase, DollarSign, FileText, Building2 } from "lucide-react"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "@/lib/session"
import { UserRole, SosMatchStatus } from "@prisma/client"
import { StatusBadge } from "@/components/ui/status-badge"
import { WORK_FIELD_LABELS, CREDENTIAL_LABELS, SOS_STATUS_LABELS } from "@/lib/constants"
import MissionCompleteButton from "./MissionCompleteButton"
import WorkerCancelButton from "./WorkerCancelButton"

function fmtDate(date: Date) {
  return date.toLocaleString("ko-KR", {
    year: "numeric", month: "long", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  })
}

function InfoSection({ title, icon: Icon, children }: {
  title: string
  icon: React.ElementType
  children: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
      <div className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">
        <Icon className="w-3.5 h-3.5" />
        {title}
      </div>
      {children}
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex gap-3 text-sm">
      <span className="text-gray-400 w-24 shrink-0">{label}</span>
      <span className="text-gray-800 font-medium">{value}</span>
    </div>
  )
}

function sosStatusVariant(status: string) {
  switch (status) {
    case "COMPLETED":  return "approved"
    case "CONFIRMED":  return "confirmed"
    case "CANCELLED":  return "rejected"
    case "UNRESOLVED": return "unresolved"
    case "DISPATCHING":return "active"
    default:           return "pending"
  }
}

interface ScheduleDay {
  date: string
  endDate?: string
  startTime: string
  endTime: string
}

export default async function WorkerSosDetailPage({
  params,
}: {
  params: Promise<{ matchId: string }>
}) {
  const { matchId } = await params

  const session = await getServerSession()
  if (!session?.user?.id) redirect("/login")
  if (session.user.role !== UserRole.WORKER) redirect("/")

  const workerProfile = await prisma.workerProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  })
  if (!workerProfile) redirect("/profile/edit")

  const match = await prisma.sosMatch.findUnique({
    where: { id: matchId },
    include: {
      sosRequest: {
        include: {
          company: { select: { name: true, phone: true, address: true } },
        },
      },
    },
  })

  // 다른 워커의 매치 접근 차단
  if (!match || match.workerProfileId !== workerProfile.id) notFound()
  if (match.status !== SosMatchStatus.CONFIRMED && match.status !== SosMatchStatus.ACCEPTED) notFound()

  const req = match.sosRequest
  const scheduleDays = (req.scheduleDays as unknown as ScheduleDay[] | null) ?? null

  // 수락 취소 가능 여부 계산 (ACCEPTED 상태만)
  const acceptedAt = match.respondedAt ?? match.notifiedAt
  const elapsedMs = Date.now() - new Date(acceptedAt).getTime()
  const withinOneHour = elapsedMs <= 60 * 60 * 1000

  // 보증 포인트 조회 (WORKER_DEDUCT 거래)
  const workerProfile2 = await prisma.workerProfile.findUnique({
    where: { id: workerProfile.id },
    select: { userId: true },
  })
  const workerAccount = workerProfile2
    ? await prisma.pointAccount.findUnique({ where: { userId: workerProfile2.userId } })
    : null
  const workerDeductTx = workerAccount
    ? await prisma.pointTransaction.findFirst({
        where: { sosRequestId: req.id, type: "WORKER_DEDUCT", accountId: workerAccount.id },
      })
    : null
  const workerFee = workerDeductTx ? Math.abs(workerDeductTx.amount) : 0

  return (
    <div className="space-y-5 pb-10">
      {/* 뒤로 가기 */}
      <Link
        href="/worker-history"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        파견 이력으로 돌아가기
      </Link>

      {/* 헤더 */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs text-gray-400">SOS 요청</p>
            <h1 className="text-lg font-bold text-gray-900">{req.title}</h1>
            <p className="text-sm text-gray-500">{req.company.name}</p>
          </div>
          <StatusBadge
            variant={sosStatusVariant(req.status) as "approved" | "confirmed" | "rejected" | "unresolved" | "active" | "pending"}
            label={SOS_STATUS_LABELS[req.status] ?? req.status}
          />
        </div>
        {match.confirmedAt && (
          <p className="mt-3 text-xs text-gray-400">
            확정일: {fmtDate(new Date(match.confirmedAt))}
          </p>
        )}
      </div>

      {/* 배치 일정 */}
      <InfoSection title="배치 일정" icon={Calendar}>
        {scheduleDays && scheduleDays.length > 0 ? (
          <div className="space-y-2">
            {scheduleDays.map((d, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <span className="w-5 h-5 rounded-full bg-brand/10 text-brand text-xs flex items-center justify-center font-semibold shrink-0">
                  {i + 1}
                </span>
                <span className="text-gray-800">
                  {d.date}
                  {d.endDate && d.endDate !== d.date ? ` ~ ${d.endDate}` : ""}
                  {"  "}
                  <span className="text-gray-500">{d.startTime} ~ {d.endTime}</span>
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            <InfoRow label="배치 일시" value={fmtDate(new Date(req.scheduledAt))} />
            {req.scheduledEndAt && (
              <InfoRow label="종료 일시" value={fmtDate(new Date(req.scheduledEndAt))} />
            )}
          </div>
        )}
      </InfoSection>

      {/* 집결지 */}
      <InfoSection title="집결지" icon={MapPin}>
        <p className="text-sm text-gray-800 font-medium">{req.locationAddress}</p>
      </InfoSection>

      {/* 인력 조건 */}
      <InfoSection title="인력 조건" icon={Users}>
        <div className="space-y-2">
          <InfoRow label="필요 인원" value={`${req.requiredCount}명`} />
          {req.requiredFields.length > 0 && (
            <InfoRow
              label="업무 분야"
              value={req.requiredFields.map((f) => WORK_FIELD_LABELS[f] ?? f).join(", ")}
            />
          )}
          {req.requiredCredentials.length > 0 && (
            <InfoRow
              label="필요 자격증"
              value={req.requiredCredentials.map((c) => CREDENTIAL_LABELS[c] ?? c).join(", ")}
            />
          )}
        </div>
      </InfoSection>

      {/* 급여 */}
      <InfoSection title="급여" icon={DollarSign}>
        <InfoRow label="일급" value={`${req.hourlyRate.toLocaleString()}원/일`} />
      </InfoSection>

      {/* 업체 정보 */}
      <InfoSection title="업체 정보" icon={Building2}>
        <div className="space-y-2">
          <InfoRow label="업체명" value={req.company.name} />
          {req.company.phone && <InfoRow label="연락처" value={req.company.phone} />}
          {req.company.address && <InfoRow label="주소" value={req.company.address} />}
        </div>
      </InfoSection>

      {/* 복장 규정 */}
      {req.dressCode && (
        <InfoSection title="복장 규정" icon={Briefcase}>
          <p className="text-sm text-gray-800 font-medium">{req.dressCode}</p>
        </InfoSection>
      )}

      {/* 현장 담당자 연락처 */}
      {req.siteManagerContact && (
        <InfoSection title="현장 담당자 연락처" icon={FileText}>
          <div className="space-y-1">
            {req.siteManagerContact.split("\n").map((line, i) => (
              <p key={i} className="text-sm text-gray-800 font-semibold">{line}</p>
            ))}
          </div>
          <p className="text-xs text-gray-400">현장 도착 후 담당자에게 연락해 주세요.</p>
        </InfoSection>
      )}

      {/* 상세 설명 */}
      {req.description && (
        <InfoSection title="상세 설명" icon={FileText}>
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{req.description}</p>
        </InfoSection>
      )}

      {/* 수락 취소 버튼 — ACCEPTED 상태일 때만 표시 */}
      {match.status === SosMatchStatus.ACCEPTED && (
        <WorkerCancelButton
          matchId={match.id}
          withinOneHour={withinOneHour}
          workerFee={workerFee}
        />
      )}

      {/* 임무 완료 보고 버튼 — CONFIRMED 매치이고 SOS가 진행 중일 때만 표시 */}
      {match.status === SosMatchStatus.CONFIRMED &&
        (req.status === "DISPATCHING" || req.status === "CONFIRMED") && (
        <MissionCompleteButton matchId={match.id} alreadyReported={!!match.missionReportedAt} />
      )}
    </div>
  )
}
