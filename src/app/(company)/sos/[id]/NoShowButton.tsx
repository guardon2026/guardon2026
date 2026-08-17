"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { XCircle } from "lucide-react"

export default function NoShowButton({
  matchId,
  fullWidth = false,
}: {
  matchId: string
  fullWidth?: boolean
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleNoShow() {
    if (!confirm("해당 경비 인력을 노쇼(무단 불참)로 처리하시겠습니까?\n\n노쇼 카운트가 1 증가하며, 3회 누적 시 서비스 이용이 자동 정지됩니다.\n이 작업은 되돌릴 수 없습니다.")) return
    setLoading(true)
    setError("")
    try {
      const res = await fetch(`/api/sos/matches/${matchId}/no-show`, { method: "POST" })
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

  return (
    <div className={`flex flex-col gap-1 ${fullWidth ? "w-full" : "items-end"}`}>
      <button
        type="button"
        onClick={handleNoShow}
        disabled={loading}
        className={`flex items-center justify-center gap-1.5 bg-red-600 text-white font-semibold hover:bg-red-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed
          ${fullWidth ? "w-full py-3 rounded-xl text-sm" : "shrink-0 px-3 py-1.5 rounded-lg text-xs"}`}
      >
        <XCircle className={fullWidth ? "w-4 h-4" : "w-3.5 h-3.5"} />
        {loading ? "처리 중..." : "노쇼 처리"}
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
