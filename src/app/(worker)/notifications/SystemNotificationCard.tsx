"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp, Loader2 } from "lucide-react"
import { StatusBadge } from "@/components/ui/status-badge"
import { WORK_FIELD_LABELS } from "@/lib/constants"

interface DiffChange {
  field: string
  label: string
  before: string
  after: string
}

interface DiffBody {
  __v: number
  text: string
  changes: DiffChange[]
}

interface SosDetail {
  id: string
  title: string
  locationAddress: string
  scheduledAt: string
  scheduledEndAt: string | null
  requiredCount: number
  requiredFields: string[]
  requiredCredentials: string[]
  hourlyRate: number
  description: string | null
  status: string
}

function parseDiff(body: string): DiffBody | null {
  try {
    if (!body.startsWith("{")) return null
    const parsed = JSON.parse(body)
    if (parsed.__v === 1 && Array.isArray(parsed.changes)) return parsed as DiffBody
    return null
  } catch {
    return null
  }
}

function relativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  if (diffSec < 60) return "방금 전"
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}분 전`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}시간 전`
  return `${Math.floor(diffHr / 24)}일 전`
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("ko-KR", {
    year: "numeric", month: "long", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  })
}

const CRED_LABELS: Record<string, string> = {
  SECURITY_GUARD_1: "경비지도사 1급", SECURITY_GUARD_2: "경비지도사 2급",
  FIRE_SAFETY: "소방안전관리자", DRIVER_LICENSE: "운전면허",
}

interface Props {
  id: string
  title: string
  body: string
  type?: string
  isRead: boolean
  createdAt: Date
  sosRequestId: string | null
}

export default function SystemNotificationCard({ title, body, type, isRead, createdAt, sosRequestId }: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [sosDetail, setSosDetail] = useState<SosDetail | null>(null)

  const diff = parseDiff(body)
  const hasDiff = diff !== null
  const displayText = hasDiff ? diff.text : body
  const canExpand = hasDiff ? diff.changes.length > 0 : !!sosRequestId

  async function handleClick() {
    if (!canExpand) return

    if (!open && !hasDiff && sosRequestId && !sosDetail) {
      setLoading(true)
      try {
        const res = await fetch(`/api/sos/requests/${sosRequestId}`)
        if (res.ok) setSosDetail(await res.json())
      } finally {
        setLoading(false)
      }
    }
    setOpen((v) => !v)
  }

  return (
    <div
      className={`rounded-xl border transition-colors ${
        isRead
          ? "bg-white border-gray-100 opacity-75"
          : "bg-amber-50/40 border-l-4 border-l-amber-400 border-gray-100"
      }`}
    >
      {/* 헤더 */}
      <button
        type="button"
        className={`w-full text-left p-4 flex items-start gap-2 ${canExpand ? "cursor-pointer" : "cursor-default"}`}
        onClick={handleClick}
      >
        <div className="flex-1 min-w-0 space-y-1">
          <p className="text-sm font-semibold text-gray-900">{title}</p>
          <p className="text-xs text-gray-600 leading-snug">{displayText}</p>
          <p className="text-xs text-gray-400">{relativeTime(createdAt)}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0 pt-0.5">
          <StatusBadge variant="sos" label={type === "SYSTEM_NOTICE" ? "시스템 안내" : "변경 안내"} />
          {loading && <Loader2 size={15} className="animate-spin text-gray-400" />}
          {!loading && canExpand && (
            <span className="text-gray-400">
              {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </span>
          )}
        </div>
      </button>

      {/* diff 있는 신규 알림: 변경 전/후 비교 표 */}
      {open && hasDiff && diff.changes.length > 0 && (
        <div className="px-4 pb-4">
          <div className="rounded-lg border border-gray-200 overflow-hidden text-xs">
            <div className="grid grid-cols-[90px_1fr_1fr] bg-gray-50 border-b border-gray-200">
              <div className="px-3 py-2 font-semibold text-gray-500">항목</div>
              <div className="px-3 py-2 font-semibold text-red-500 border-l border-gray-200">변경 전</div>
              <div className="px-3 py-2 font-semibold text-green-600 border-l border-gray-200">변경 후</div>
            </div>
            {diff.changes.map((c, i) => (
              <div
                key={c.field}
                className={`grid grid-cols-[90px_1fr_1fr] ${i !== diff.changes.length - 1 ? "border-b border-gray-100" : ""}`}
              >
                <div className="px-3 py-2.5 text-gray-500 font-medium">{c.label}</div>
                <div className="px-3 py-2.5 text-red-600 bg-red-50/50 border-l border-gray-100 break-words">{c.before}</div>
                <div className="px-3 py-2.5 text-green-700 bg-green-50/50 border-l border-gray-100 break-words">{c.after}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* diff 없는 구형 알림: 현재 SOS 내용 표시 */}
      {open && !hasDiff && sosDetail && (
        <div className="px-4 pb-4">
          <p className="text-xs font-semibold text-gray-500 mb-2">현재 SOS 요청 내용</p>
          <div className="rounded-lg border border-gray-200 overflow-hidden text-xs divide-y divide-gray-100">
            {[
              { label: "제목", value: sosDetail.title },
              { label: "장소", value: sosDetail.locationAddress },
              { label: "배치 일시", value: fmtDate(sosDetail.scheduledAt) },
              ...(sosDetail.scheduledEndAt ? [{ label: "종료 일시", value: fmtDate(sosDetail.scheduledEndAt) }] : []),
              { label: "필요 인원", value: `${sosDetail.requiredCount}명` },
              { label: "일급", value: `${sosDetail.hourlyRate.toLocaleString()}원/일` },
              ...(sosDetail.requiredFields.length > 0
                ? [{ label: "업무 분야", value: sosDetail.requiredFields.map((f) => WORK_FIELD_LABELS[f as keyof typeof WORK_FIELD_LABELS] ?? f).join(", ") }]
                : []),
              ...(sosDetail.requiredCredentials.length > 0
                ? [{ label: "필요 자격증", value: sosDetail.requiredCredentials.map((c) => CRED_LABELS[c] ?? c).join(", ") }]
                : []),
              ...(sosDetail.description ? [{ label: "상세 설명", value: sosDetail.description }] : []),
            ].map((row) => (
              <div key={row.label} className="grid grid-cols-[90px_1fr] bg-white">
                <div className="px-3 py-2.5 text-gray-500 font-medium">{row.label}</div>
                <div className="px-3 py-2.5 text-gray-700 border-l border-gray-100 break-words">{row.value}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
