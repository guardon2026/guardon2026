"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { SOS_NOTIFICATION_LABELS } from "@/lib/constants"

// ─────────────────────────────────────────
// NotificationActions — 수락/거절 버튼
// NOTIFIED 상태의 매치에만 렌더링됩니다.
// ─────────────────────────────────────────

export default function NotificationActions({ matchId }: { matchId: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [actionType, setActionType] = useState<"accept" | "reject" | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleAction(type: "accept" | "reject") {
    setActionType(type)
    setError(null)

    try {
      const res = await fetch(`/api/sos/matches/${matchId}/${type}`, {
        method: "POST",
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? SOS_NOTIFICATION_LABELS.ACTION_FAILED)
        setActionType(null)
        return
      }

      startTransition(() => {
        router.refresh()
      })
    } catch {
      setError(SOS_NOTIFICATION_LABELS.ACTION_FAILED)
      setActionType(null)
    }
  }

  return (
    <div className="space-y-2">
      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}
      <div className="flex gap-2">
        <button
          type="button"
          disabled={isPending}
          onClick={() => handleAction("accept")}
          className="flex-1 py-2 rounded-lg bg-[#2563EB] text-white text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {actionType === "accept" && isPending
            ? SOS_NOTIFICATION_LABELS.ACCEPTING
            : SOS_NOTIFICATION_LABELS.ACCEPT_BUTTON}
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => handleAction("reject")}
          className="flex-1 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          {actionType === "reject" && isPending
            ? SOS_NOTIFICATION_LABELS.REJECTING
            : SOS_NOTIFICATION_LABELS.REJECT_BUTTON}
        </button>
      </div>
    </div>
  )
}
