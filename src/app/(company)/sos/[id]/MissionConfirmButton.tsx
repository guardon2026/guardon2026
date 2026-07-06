"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle2 } from "lucide-react"

export default function MissionConfirmButton({
  matchId,
  fullWidth = false,
  alreadySettled = false,
}: {
  matchId: string
  fullWidth?: boolean
  alreadySettled?: boolean
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleConfirm() {
    if (!confirm("해당 경비 인력의 임무 완료를 확인하시겠습니까?\n확인하면 해당 경비 인력의 인건비가 정산됩니다.")) return
    setLoading(true)
    setError("")
    try {
      const res = await fetch(`/api/sos/matches/${matchId}/mission-confirm`, { method: "POST" })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? "오류가 발생했습니다.")
        return
      }
      router.refresh()
    } catch {
      setError("네트워크 오류가 발생했습니다.")
    } finally {
      setLoading(false)
    }
  }

  if (alreadySettled) {
    return (
      <div className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 text-gray-400 font-semibold cursor-not-allowed
        ${fullWidth ? "w-full py-3 rounded-xl text-sm" : "shrink-0 px-3 py-1.5 rounded-lg text-xs"}`}
      >
        <CheckCircle2 className={fullWidth ? "w-4 h-4" : "w-3.5 h-3.5"} />
        정산 완료
      </div>
    )
  }

  return (
    <div className={`flex flex-col gap-1 ${fullWidth ? "w-full" : "items-end"}`}>
      <button
        type="button"
        onClick={handleConfirm}
        disabled={loading}
        className={`flex items-center justify-center gap-1.5 bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed
          ${fullWidth ? "w-full py-3 rounded-xl text-sm" : "shrink-0 px-3 py-1.5 rounded-lg text-xs"}`}
      >
        <CheckCircle2 className={fullWidth ? "w-4 h-4" : "w-3.5 h-3.5"} />
        {loading ? "처리 중..." : "정산하기"}
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
