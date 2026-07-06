"use client"

import { useState } from "react"
import Image from "next/image"
import { X, User } from "lucide-react"
import { StatusBadge } from "@/components/ui/status-badge"
import { WORK_FIELD_LABELS, CREDENTIAL_LABELS, SOS_MATCH_STATUS_LABELS } from "@/lib/constants"
import { SosMatchStatus } from "@prisma/client"
import ConfirmButton from "./ConfirmButton"
import MissionConfirmButton from "./MissionConfirmButton"

interface WorkerProfile {
  id: string
  experienceYears: number
  workFields: string[]
  declaredCredentials: string[]
  desiredHourlyRate: number | null
  height: number | null
  weight: number | null
  profileImageUrl: string | null
  bio: string | null
  user: { id: string; name: string | null }
  credentials: { type: string }[]
}

interface MatchItem {
  id: string
  status: SosMatchStatus
  missionReportedAt: Date | null
  workerProfile: WorkerProfile
}

function matchStatusVariant(status: string) {
  switch (status) {
    case "NOTIFIED":  return "pending" as const
    case "ACCEPTED":  return "active" as const
    case "REJECTED":  return "rejected" as const
    case "CONFIRMED": return "confirmed" as const
    default:          return "unresolved" as const
  }
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex gap-3 text-sm">
      <span className="text-gray-400 w-24 shrink-0">{label}</span>
      <span className="text-gray-800 font-medium">{value}</span>
    </div>
  )
}

function WorkerCard({
  match,
  sosRequestId,
  sosStatus,
  onClick,
}: {
  match: MatchItem
  sosRequestId: string
  sosStatus?: string
  onClick: () => void
}) {
  const wp = match.workerProfile
  const isAccepted = match.status === SosMatchStatus.ACCEPTED
  const hasMissionReport = !!match.missionReportedAt

  return (
    <div
      className={`bg-white rounded-2xl border shadow-card p-4 space-y-3 ${
        hasMissionReport ? "border-emerald-300 bg-emerald-50/20" :
        isAccepted ? "border-brand/30 bg-blue-50/20" : "border-gray-100"
      }`}
    >
      <div className="flex items-center justify-between gap-4">
        {/* 워커 정보 */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center shrink-0 overflow-hidden">
            {wp.profileImageUrl ? (
              <Image src={wp.profileImageUrl} alt="" width={36} height={36} className="object-cover w-full h-full" unoptimized />
            ) : (
              <span className="text-sm font-bold text-gray-500">{wp.user.name?.charAt(0) ?? "?"}</span>
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-gray-900">{wp.user.name}</span>
              <StatusBadge
                variant={matchStatusVariant(match.status)}
                label={SOS_MATCH_STATUS_LABELS[match.status] ?? match.status}
              />
              {hasMissionReport && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">
                  임무 완료 보고됨
                </span>
              )}
            </div>
            {wp.credentials.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {wp.credentials.map((c) => (
                  <span key={c.type} className="text-xs px-1.5 py-0.5 bg-blue-50 text-brand rounded-md">
                    {CREDENTIAL_LABELS[c.type] ?? c.type}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onClick}
            className="px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition-colors"
          >
            보기
          </button>
          {isAccepted && (
            <ConfirmButton sosRequestId={sosRequestId} matchId={match.id} workerName={wp.user.name ?? undefined} />
          )}
          {hasMissionReport && (
            <MissionConfirmButton matchId={match.id} alreadySettled={sosStatus === "COMPLETED"} />
          )}
        </div>
      </div>
    </div>
  )
}

function WorkerDetailDrawer({
  match,
  sosRequestId,
  sosStatus,
  onClose,
}: {
  match: MatchItem
  sosRequestId: string
  sosStatus?: string
  onClose: () => void
}) {
  const wp = match.workerProfile
  const isAccepted = match.status === SosMatchStatus.ACCEPTED
  const hasMissionReport = !!match.missionReportedAt
  const approvedCreds = wp.credentials
  const declaredCreds = (wp.declaredCredentials ?? []).filter(
    (d) => !approvedCreds.some((a) => a.type === d),
  )

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* 배경 오버레이 */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* 드로어 */}
      <div className="relative bg-white w-full max-w-lg rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* 헤더 */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center shrink-0">
              {wp.profileImageUrl ? (
                <Image src={wp.profileImageUrl} alt="" width={40} height={40} className="object-cover w-full h-full" unoptimized />
              ) : (
                <User className="w-5 h-5 text-gray-400" />
              )}
            </div>
            <div>
              <p className="text-base font-bold text-gray-900">{wp.user.name}</p>
              <StatusBadge
                variant={matchStatusVariant(match.status)}
                label={SOS_MATCH_STATUS_LABELS[match.status] ?? match.status}
              />
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* 본문 */}
        <div className="px-6 py-5 space-y-5">

          {/* 경력 / 신체 */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">기본 정보</p>
            <div className="space-y-1.5">
              <InfoRow label="경력" value={`${wp.experienceYears}년`} />
              {wp.height != null && <InfoRow label="키" value={`${wp.height}cm`} />}
              {wp.weight != null && <InfoRow label="몸무게" value={`${wp.weight}kg`} />}
              {wp.desiredHourlyRate != null && (
                <InfoRow label="희망 시급" value={`${wp.desiredHourlyRate.toLocaleString()}원`} />
              )}
            </div>
          </div>

          {/* 전문 분야 */}
          {wp.workFields.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">전문 분야</p>
              <div className="flex flex-wrap gap-1.5">
                {wp.workFields.map((f) => (
                  <span key={f} className="px-2.5 py-1 bg-blue-50 text-brand text-xs font-medium rounded-full">
                    {WORK_FIELD_LABELS[f] ?? f}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 인증 자격증 */}
          {approvedCreds.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">인증 자격증</p>
              <div className="flex flex-wrap gap-1.5">
                {approvedCreds.map((c) => (
                  <span key={c.type} className="px-2.5 py-1 bg-green-50 text-green-700 text-xs font-medium rounded-full">
                    ✓ {CREDENTIAL_LABELS[c.type] ?? c.type}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 자기신고 자격증 */}
          {declaredCreds.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">보유 자격증 (자기신고)</p>
              <div className="flex flex-wrap gap-1.5">
                {declaredCreds.map((c) => (
                  <span key={c} className="px-2.5 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
                    {CREDENTIAL_LABELS[c] ?? c}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 자기소개 */}
          {wp.bio && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">자기소개</p>
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{wp.bio}</p>
            </div>
          )}
        </div>

        {/* 하단 버튼 */}
        {(isAccepted || hasMissionReport) && (
          <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 space-y-2">
            {isAccepted && (
              <ConfirmButton sosRequestId={sosRequestId} matchId={match.id} workerName={wp.user.name ?? undefined} fullWidth />
            )}
            {hasMissionReport && (
              <MissionConfirmButton matchId={match.id} fullWidth alreadySettled={sosStatus === "COMPLETED"} />
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default function WorkerMatchGroup({
  status,
  label,
  matches,
  sosRequestId,
  sosStatus,
}: {
  status: string
  label: string
  matches: MatchItem[]
  sosRequestId: string
  sosStatus?: string
}) {
  const [selectedMatch, setSelectedMatch] = useState<MatchItem | null>(null)

  if (matches.length === 0) return null

  return (
    <>
      <div className="space-y-2">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
          {label} ({matches.length})
        </p>
        <div className="space-y-2">
          {matches.map((match) => (
            <WorkerCard
              key={match.id}
              match={match}
              sosRequestId={sosRequestId}
              sosStatus={sosStatus}
              onClick={() => setSelectedMatch(match)}
            />
          ))}
        </div>
      </div>

      {selectedMatch && (
        <WorkerDetailDrawer
          match={selectedMatch}
          sosRequestId={sosRequestId}
          sosStatus={sosStatus}
          onClose={() => setSelectedMatch(null)}
        />
      )}
    </>
  )
}
