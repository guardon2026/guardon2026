"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export default function UnsuspendButton({ workerId }: { workerId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleUnsuspend() {
    if (!confirm("이 경비 인력의 서비스 이용 정지를 해제하시겠습니까?\n\n노쇼 카운트도 0으로 초기화됩니다.")) return

    setLoading(true)
    setError("")
    try {
      const res = await fetch(`/api/admin/workers/${workerId}/unsuspend`, { method: "POST" })
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
    <div className="space-y-1">
      <button
        type="button"
        onClick={handleUnsuspend}
        disabled={loading}
        className="inline-flex items-center px-3 py-1.5 rounded-lg border border-red-200 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
      >
        {loading ? "처리 중..." : "정지 해제"}
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
