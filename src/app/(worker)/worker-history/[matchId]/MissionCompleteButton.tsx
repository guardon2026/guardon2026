"use client"

import { useState } from "react"
import { CheckCircle2, AlertTriangle } from "lucide-react"

export default function MissionCompleteButton({
  matchId,
  alreadyReported = false,
  contractComplete = true,
}: {
  matchId: string
  alreadyReported?: boolean
  contractComplete?: boolean
}) {
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(alreadyReported)
  const [error, setError] = useState("")

  async function handleComplete() {
    if (!confirm("경비 업체에게 임무 완료를 보고하시겠습니까?")) return
    setLoading(true)
    setError("")
    try {
      const res = await fetch(`/api/sos/matches/${matchId}/complete`, { method: "POST" })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? "오류가 발생했습니다.")
        return
      }
      setDone(true)
    } catch {
      setError("네트워크 오류가 발생했습니다.")
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-green-50 border border-green-200 text-green-700 text-sm font-medium">
        <CheckCircle2 className="w-4 h-4 shrink-0" />
        임무 완료 보고가 전송됐습니다.
      </div>
    )
  }

  if (!contractComplete) {
    return (
      <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-sm font-medium">
        <AlertTriangle className="w-4 h-4 shrink-0" />
        근로계약서 서명이 완료되어야 임무 완료 보고를 할 수 있습니다.
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleComplete}
        disabled={loading}
        className="w-full py-3 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {loading ? "전송 중..." : "임무 완료 보고"}
      </button>
      {error && <p className="text-xs text-red-600 text-center">{error}</p>}
    </div>
  )
}
