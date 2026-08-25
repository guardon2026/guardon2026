"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle2 } from "lucide-react"
import { SOS_DETAIL } from "@/lib/constants"

export default function ConfirmButton({
  sosRequestId,
  matchId,
  workerName,
  fullWidth = false,
}: {
  sosRequestId: string
  matchId: string
  workerName?: string
  fullWidth?: boolean
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [successMsg, setSuccessMsg] = useState("")

  async function handleConfirm() {
    setLoading(true)
    setError("")
    setSuccessMsg("")
    try {
      const res = await fetch(`/api/sos/matches/${matchId}/confirm`, {
        method: "POST",
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? "확정 중 오류가 발생했습니다.")
        return
      }
      const name = workerName ?? "경비 인력"
      setSuccessMsg(`${name}님이 정상적으로 확정되었습니다.`)
      setTimeout(() => router.refresh(), 1500)
    } catch {
      setError("확정 중 오류가 발생했습니다.")
    } finally {
      setLoading(false)
    }
  }

  if (successMsg) {
    return (
      <div className={`flex items-center gap-2 px-3 py-2 rounded-xl bg-green-50 border border-green-200 text-green-700 text-sm font-medium ${fullWidth ? "w-full justify-center" : ""}`}>
        <CheckCircle2 className="w-4 h-4 shrink-0" />
        {successMsg}
      </div>
    )
  }

  return (
    <div className={`flex flex-col gap-1 ${fullWidth ? "w-full" : "items-end"}`}>
      <button
        type="button"
        onClick={handleConfirm}
        disabled={loading}
        className={`bg-green-600 text-white font-semibold hover:bg-green-700 transition-colors
                   disabled:opacity-60 disabled:cursor-not-allowed
                   ${fullWidth
                     ? "w-full py-3 rounded-xl text-sm"
                     : "shrink-0 px-3 py-1.5 rounded-lg text-xs"}`}
      >
        {loading ? "처리 중..." : SOS_DETAIL.CONFIRM_BUTTON}
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
