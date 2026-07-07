import { notFound, redirect } from "next/navigation"
import { ArrowLeft, MapPin, Users, Zap, Shirt, FileText, Phone, Clock, Calendar } from "lucide-react"
import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "@/lib/session"
import { UserRole, SosMatchStatus } from "@prisma/client"
import { PageHeader } from "@/components/ui/page-header"
import { StatusBadge } from "@/components/ui/status-badge"
import { WORK_FIELD_LABELS, CREDENTIAL_LABELS, DRESS_CODE_LABELS } from "@/lib/constants"
import type { StatusVariant } from "@/components/ui/status-badge"
import WorkerMatchActions from "./WorkerMatchActions"

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

interface ScheduleDay {
  date: string
  endDate?: string
  startTime: string
  endTime: string
  requiredCount?: number
}

function extractDays(days: unknown): ScheduleDay[] | null {
  if (!Array.isArray(days) || days.length === 0) return null
  const result: ScheduleDay[] = []
  for (const d of days) {
    if (d && typeof d === "object") {
      const e = d as Record<string, unknown>
      if (typeof e.date === "string" && typeof e.startTime === "string" && typeof e.endTime === "string") {
        result.push({
          date: e.date,
          endDate: typeof e.endDate === "string" ? e.endDate : undefined,
          startTime: e.startTime,
          endTime: e.endTime,
          requiredCount: typeof e.requiredCount === "number" ? e.requiredCount : undefined,
        })
      }
    }
  }
  return result.length > 0 ? result : null
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("ko-KR", {
    month: "long", day: "numeric", weekday: "short",
  })
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

  // 이 워커의 매치인지 확인
  const match = await prisma.sosMatch.findUnique({
    where: {
      sosRequestId_workerProfileId: {
        sosRequestId: id,
        workerProfileId: workerProfile.id,
      },
    },
    select: { id: true, status: true },
  })
  if (!match) notFound()

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
      requiredFields: true,
      requiredCredentials: true,
      dressCode: true,
      dressCodeNote: true,
      description: true,
      siteManagerContact: true,
    },
  })
  if (!sos) notFound()

  const scheduleDays = extractDays(sos.scheduleDays)
  const isAccepted = match.status === SosMatchStatus.ACCEPTED || match.status === SosMatchStatus.CONFIRMED
  const canAct = match.status === SosMatchStatus.NOTIFIED

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-5">

        <PageHeader
          title={sos.title}
          subtitle="SOS 긴급 요청 상세"
          action={
            <StatusBadge
              variant={matchStatusVariant(match.status)}
              label={MATCH_STATUS_LABELS[match.status]}
            />
          }
        />

        {/* 기본 정보 */}
        <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6 space-y-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">요청 정보</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InfoRow icon={MapPin} label="집결지" value={sos.locationAddress} />
            <InfoRow icon={Zap} label="일급" value={`${sos.hourlyRate.toLocaleString()}원/일`} />
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

        {/* 배치 일정 */}
        <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6 space-y-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">배치 일정</p>

          {scheduleDays ? (
            <div className="space-y-2">
              {scheduleDays.map((day, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 text-sm">
                  <Clock className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">
                      {formatDate(day.date)}
                      {day.endDate && day.endDate !== day.date && (
                        <span className="text-gray-500"> → {formatDate(day.endDate)}</span>
                      )}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {day.startTime} → {day.endTime}
                      {day.requiredCount !== undefined && (
                        <span className="ml-2 text-brand font-medium">{day.requiredCount}명</span>
                      )}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-start gap-2.5">
              <Calendar className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {new Date(sos.scheduledAt).toLocaleString("ko-KR", {
                    year: "numeric", month: "long", day: "numeric",
                    hour: "2-digit", minute: "2-digit",
                  })}
                </p>
                {sos.scheduledEndAt && (
                  <p className="text-xs text-gray-500 mt-0.5">
                    ~ {new Date(sos.scheduledEndAt).toLocaleString("ko-KR", {
                      month: "long", day: "numeric", hour: "2-digit", minute: "2-digit",
                    })}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 현장 담당자 연락처 — 수락/확정 후에만 표시 */}
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

        {/* 수락/거절 버튼 */}
        {canAct && <WorkerMatchActions matchId={match.id} />}

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
