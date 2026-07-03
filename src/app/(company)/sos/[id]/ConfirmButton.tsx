"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { SOS_DETAIL } from "@/lib/constants"

export default function ConfirmButton({
  sosRequestId,
  matchId,
  fullWidth = false,
}: {
  sosRequestId: string
  matchId: string
  fullWidth?: boolean
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleConfirm() {
    setLoading(true)
    setError("")
    try {
      const res = await fetch(`/api/sos/matches/${matchId}/confirm`, {
        method: "POST",
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? "확정 중 오류가 발생했습니다.")
        return
      }
      router.refresh()
    } catch {
      setError("확정 중 오류가 발생했습니다.")
    } finally {
      setLoading(false)
    }
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
