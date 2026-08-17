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
import { ScheduleDayList } from "@/components/sos/ScheduleDayList"

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
      workContract: { select: { employerSignedAt: true, workerSignedAt: true } },
    },
  })

  // 다른 워커의 매치 접근 차단
  if (!match || match.workerProfileId !== workerProfile.id) notFound()
  if (match.status !== SosMatchStatus.CONFIRMED && match.status !== SosMatchStatus.ACCEPTED) notFound()

  const req = match.sosRequest

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

      {/* 배치 일정 — 이 매치의 날짜(내 근무일)를 강조 표시 */}
      <InfoSection title="배치 일정" icon={Calendar}>
        <ScheduleDayList
          scheduleDays={req.scheduleDays}
          scheduledAt={req.scheduledAt}
          scheduledEndAt={req.scheduledEndAt}
          highlightDate={match.scheduleDate}
        />
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

      {/* 근로계약서 — CONFIRMED 상태일 때 표시 */}
      {match.status === SosMatchStatus.CONFIRMED && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-gray-900">일용직 근로계약서</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {match.workContract?.workerSignedAt && match.workContract?.employerSignedAt
                ? "✅ 양측 서명 완료"
                : match.workContract?.workerSignedAt
                ? "✍️ 내 서명 완료 · 사업주 서명 대기"
                : match.workContract?.employerSignedAt
                ? "✍️ 사업주 서명 완료 · 내 서명 필요"
                : "미작성"}
            </p>
          </div>
          <Link
            href={`/worker-history/${matchId}/contract`}
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-brand text-white text-xs font-semibold hover:bg-blue-700 transition-colors"
          >
            <FileText className="w-3.5 h-3.5" />
            {match.workContract?.workerSignedAt ? "계약서 보기" : "계약서 작성"}
          </Link>
        </div>
      )}

      {/* 수락 취소 버튼 — ACCEPTED 상태일 때만 표시 */}
      {match.status === SosMatchStatus.ACCEPTED && (
        <WorkerCancelButton matchId={match.id} />
      )}

      {/* 임무 완료 보고 버튼 — CONFIRMED 매치이고 SOS가 진행 중일 때만 표시 */}
      {match.status === SosMatchStatus.CONFIRMED &&
        (req.status === "DISPATCHING" || req.status === "CONFIRMED") && (
        <MissionCompleteButton matchId={match.id} alreadyReported={!!match.missionReportedAt} />
      )}
    </div>
  )
}
