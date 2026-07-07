"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle2, XCircle } from "lucide-react"

export default function WorkerMatchActions({ matchId }: { matchId: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [actionType, setActionType] = useState<"accept" | "reject" | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleAction(type: "accept" | "reject") {
    setActionType(type)
    setError(null)
    try {
      const res = await fetch(`/api/sos/matches/${matchId}/${type}`, { method: "POST" })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? "처리 중 오류가 발생했습니다.")
        setActionType(null)
        return
      }
      startTransition(() => router.refresh())
    } catch {
      setError("네트워크 오류가 발생했습니다.")
      setActionType(null)
    }
  }

  return (
    <div className="space-y-2">
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
