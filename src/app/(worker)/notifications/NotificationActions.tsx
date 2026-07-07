"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Coins, Zap } from "lucide-react"
import { SOS_NOTIFICATION_LABELS } from "@/lib/constants"

export default function NotificationActions({ matchId }: { matchId: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [actionType, setActionType] = useState<"accept" | "reject" | "charge-accept" | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [shortfall, setShortfall] = useState<number>(0)

  async function tryAccept() {
    const res = await fetch(`/api/sos/matches/${matchId}/accept`, { method: "POST" })
    if (res.status === 402) {
      const data = await res.json().catch(() => ({}))
      setShortfall((data.requiredPoints ?? 0) - (data.currentBalance ?? 0))
      setError(data.error ?? "포인트가 부족합니다.")
      return false
    }
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? SOS_NOTIFICATION_LABELS.ACTION_FAILED)
      return false
    }
    return true
  }

  async function handleAccept() {
    setActionType("accept")
    setError(null)
    setShortfall(0)
    const ok = await tryAccept()
    if (ok) startTransition(() => router.refresh())
    else setActionType(null)
  }

  async function handleChargeAndAccept() {
    setActionType("charge-accept")
    setError(null)

    // 1단계: 부족분 충전
    const chargeRes = await fetch("/api/points/self-charge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: shortfall }),
    })
    if (!chargeRes.ok) {
      const data = await chargeRes.json().catch(() => ({}))
      setError(data.error ?? "충전 중 오류가 발생했습니다.")
      setActionType(null)
      return
    }

    // 2단계: 수락 재시도
    const ok = await tryAccept()
    if (ok) startTransition(() => router.refresh())
    else setActionType(null)
  }

  async function handleReject() {
    setActionType("reject")
    setError(null)
    setShortfall(0)

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
      {/* 포인트 부족 시 — 즉시 충전 + 수락 버튼 */}
      {shortfall > 0 && (
        <button
          type="button"
          disabled={isLoading}
          onClick={handleChargeAndAccept}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-amber-400 hover:bg-amber-500 transition-colors text-sm font-semibold text-gray-900 disabled:opacity-50"
        >
          <Coins className="w-4 h-4 shrink-0" />
          {actionType === "charge-accept"
            ? "처리 중..."
            : `부족한 포인트 즉시 충전하고 SOS 긴급 요청 수락하기 (${shortfall.toLocaleString()}P)`}
        </button>
      )}

      {error && shortfall === 0 && (
        <p className="text-xs text-red-600">{error}</p>
      )}

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
