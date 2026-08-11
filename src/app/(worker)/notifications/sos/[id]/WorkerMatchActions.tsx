"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle2, XCircle } from "lucide-react"

export default function WorkerMatchActions({
  matchId,
  compact = false,
}: {
  matchId: string
  /** 날짜별 인라인 버튼용 컴팩트 스타일 (배치 일정 리스트 안에서 사용) */
  compact?: boolean
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [actionType, setActionType] = useState<"accept" | "reject" | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [insuranceNotice, setInsuranceNotice] = useState(false)

  async function handleAction(type: "accept" | "reject") {
    setActionType(type)
    setError(null)
    try {
      const res = await fetch(`/api/sos/matches/${matchId}/${type}`, { method: "POST" })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error ?? "처리 중 오류가 발생했습니다.")
        setActionType(null)
        return
      }
      if (type === "accept" && data.insuranceNotice) {
        // 4대보험 전환 안내를 잠깐 보여준 뒤 새로고침
        setInsuranceNotice(true)
        setTimeout(() => startTransition(() => router.refresh()), 2500)
      } else {
        startTransition(() => router.refresh())
      }
    } catch {
      setError("네트워크 오류가 발생했습니다.")
      setActionType(null)
    }
  }

  if (compact) {
    return (
      <div className="space-y-1">
        {insuranceNotice && (
          <p className="text-xs text-amber-700 max-w-[160px]">
            이번 수락으로 4대보험 가입 대상 근무일이 발생했습니다.
          </p>
        )}
        {error && <p className="text-xs text-red-600 max-w-[140px]">{error}</p>}
        <div className="flex gap-1.5">
          <button
            type="button"
            disabled={isPending}
            onClick={() => handleAction("accept")}
            className="flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg bg-brand text-white text-xs font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            {actionType === "accept" && isPending ? "처리 중" : "수락"}
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() => handleAction("reject")}
            className="flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg border border-gray-300 text-gray-700 text-xs font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <XCircle className="w-3.5 h-3.5" />
            {actionType === "reject" && isPending ? "처리 중" : "거절"}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {insuranceNotice && (
        <p className="text-xs text-amber-700">
          이번 수락으로 4대보험 가입 대상 근무일이 발생했습니다.
        </p>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-3">
        <button
          type="button"
          disabled={isPending}
          onClick={() => handleAction("accept")}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-brand text-white text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          <CheckCircle2 className="w-4 h-4" />
          {actionType === "accept" && isPending ? "처리 중..." : "수락하기"}
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => handleAction("reject")}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <XCircle className="w-4 h-4" />
          {actionType === "reject" && isPending ? "처리 중..." : "거절하기"}
        </button>
      </div>
    </div>
  )
}
