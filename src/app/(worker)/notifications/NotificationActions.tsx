"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Zap } from "lucide-react"
import { SOS_NOTIFICATION_LABELS } from "@/lib/constants"

export default function NotificationActions({ matchId }: { matchId: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [actionType, setActionType] = useState<"accept" | "reject" | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleAccept() {
    setActionType("accept")
    setError(null)

    const res = await fetch(`/api/sos/matches/${matchId}/accept`, { method: "POST" })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? SOS_NOTIFICATION_LABELS.ACTION_FAILED)
      setActionType(null)
      return
    }
    startTransition(() => router.refresh())
  }

  async function handleReject() {
    setActionType("reject")
    setError(null)

    const res = await fetch(`/api/sos/matches/${matchId}/reject`, { method: "POST" })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? SOS_NOTIFICATION_LABELS.ACTION_FAILED)
      setActionType(null)
      return
    }
    startTransition(() => router.refresh())
  }

  const isLoading = isPending || actionType !== null

  return (
    <div className="space-y-2">
      {error && <p className="text-xs text-red-600">{error}</p>}

      {/* 수락 / 거절 */}
      <div className="flex gap-2">
        <button
          type="button"
          disabled={isLoading}
          onClick={handleAccept}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-brand text-white text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          <Zap className="w-3.5 h-3.5" />
          {actionType === "accept" ? SOS_NOTIFICATION_LABELS.ACCEPTING : SOS_NOTIFICATION_LABELS.ACCEPT_BUTTON}
        </button>
        <button
          type="button"
          disabled={isLoading}
          onClick={handleReject}
          className="flex-1 py-2.5 rounded-xl border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          {actionType === "reject" ? SOS_NOTIFICATION_LABELS.REJECTING : SOS_NOTIFICATION_LABELS.REJECT_BUTTON}
        </button>
      </div>
    </div>
  )
}
