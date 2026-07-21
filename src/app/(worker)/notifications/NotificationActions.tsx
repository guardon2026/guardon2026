"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Coins, Zap, AlertTriangle } from "lucide-react"
import { SOS_NOTIFICATION_LABELS } from "@/lib/constants"

const ACCEPT_NOTICE =
  "알고 계신가요? 특수한 상황이 발생해 SOS 긴급 요청 수락 후 1시간 이내에 취소하지 않으면, 보증 포인트는 업체 대표에게 취소 수수료로 자동 지급됩니다."

export default function NotificationActions({ matchId }: { matchId: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [actionType, setActionType] = useState<"accept" | "reject" | "charge-accept" | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [shortfall, setShortfall] = useState<number>(0)
  const [showNotice, setShowNotice] = useState(false)

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

  function handleAcceptClick() {
    setError(null)
    setShortfall(0)
    setShowNotice(true)
  }

  async function handleAcceptConfirm() {
    setShowNotice(false)
    setActionType("accept")
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
      {/* 수락 전 안내 팝업 */}
      {showNotice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-sm text-gray-800 leading-relaxed">{ACCEPT_NOTICE}</p>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowNotice(false)}
                className="flex-1 py-2.5 rounded-xl border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleAcceptConfirm}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-brand text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
              >
                <Zap className="w-3.5 h-3.5" />
                수락하기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 포인트 부족 시 — 즉시 충전 + 수락 버튼 */}
      {shortfall > 0 && (
        <div className="space-y-1.5">
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
          <p className="text-xs text-gray-500 text-center">
            지금 충전하는 포인트는 보증금으로 세이브해 두고 임무 완료 시 전액 환불 됩니다
          </p>
        </div>
      )}

      {error && shortfall === 0 && (
        <p className="text-xs text-red-600">{error}</p>
      )}

      {/* 수락 / 거절 */}
      <div className="flex gap-2">
        <button
          type="button"
          disabled={isLoading}
          onClick={handleAcceptClick}
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
