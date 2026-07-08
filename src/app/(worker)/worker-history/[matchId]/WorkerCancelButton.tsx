"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { XCircle } from "lucide-react"

export default function WorkerCancelButton({
  matchId,
  withinOneHour,
  workerFee,
}: {
  matchId: string
  withinOneHour: boolean
  workerFee: number
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleCancel() {
    const feeMsg = workerFee > 0
      ? withinOneHour
        ? `보증 포인트 ${workerFee.toLocaleString()}P가 전액 환불됩니다.`
        : `1시간이 초과되어 보증 포인트 ${workerFee.toLocaleString()}P가 업체에 취소 수수료로 지급됩니다.`
      : ""
    const confirmMsg = `SOS 수락을 취소하시겠습니까?\n\n${feeMsg}\n\n취소 후에는 되돌릴 수 없습니다.`
    if (!confirm(confirmMsg)) return

    setLoading(true)
    setError("")
    try {
      const res = await fetch(`/api/sos/matches/${matchId}/cancel`, { method: "POST" })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? "오류가 발생했습니다.")
        return
      }
      router.push("/worker-history")
      router.refresh()
    } catch {
      setError("네트워크 오류가 발생했습니다.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      {!withinOneHour && workerFee > 0 && (
        <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 leading-relaxed">
          ⚠️ 수락 후 1시간이 초과되었습니다. 취소 시 보증 포인트 {workerFee.toLocaleString()}P가 업체에 취소 수수료로 지급됩니다.
        </p>
      )}
      <button
        type="button"
        onClick={handleCancel}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 transition-colors text-sm font-semibold disabled:opacity-50"
      >
        <XCircle className="w-4 h-4" />
        {loading ? "처리 중..." : "수락 취소하기"}
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
