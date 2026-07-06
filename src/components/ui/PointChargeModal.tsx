"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { X, Coins, CheckCircle2 } from "lucide-react"

const AMOUNTS = [10000, 30000, 50000, 100000, 300000, 500000, 1000000]

export default function PointChargeModal({ onClose }: { onClose: () => void }) {
  const router = useRouter()
  const [selected, setSelected] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  async function handleCharge() {
    if (!selected) { setError("충전 금액을 선택해 주세요."); return }
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/points/self-charge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: selected }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? "충전 중 오류가 발생했습니다."); return }
      setSuccess(`${selected.toLocaleString()}P 충전 완료! 새 잔액: ${data.balance.toLocaleString()}P`)
      setTimeout(() => { router.refresh(); onClose() }, 1500)
    } catch {
      setError("네트워크 오류가 발생했습니다.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6 space-y-5">
        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <Coins className="w-4 h-4 text-amber-500" />
            포인트 충전
          </h2>
          <button type="button" onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* 금액 선택 */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-400">충전 금액 선택</p>
          <div className="grid grid-cols-2 gap-2">
            {AMOUNTS.map((amt) => (
              <button
                key={amt}
                type="button"
                onClick={() => setSelected(amt)}
                className={`py-3 rounded-xl text-sm font-semibold border transition-colors ${
                  selected === amt
                    ? "bg-brand text-white border-brand"
                    : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                }`}
              >
                {amt.toLocaleString()}P
              </button>
            ))}
          </div>
        </div>

        {/* 선택 금액 표시 */}
        {selected && (
          <div className="bg-amber-50 rounded-xl px-4 py-3 text-center">
            <span className="text-xs text-gray-500">충전 예정 금액</span>
            <p className="text-xl font-extrabold text-amber-600 mt-0.5">{selected.toLocaleString()}P</p>
          </div>
        )}

        {error && <p className="text-xs text-red-600">{error}</p>}
        {success && (
          <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 rounded-xl px-3 py-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            {success}
          </div>
        )}

        <button
          type="button"
          onClick={handleCharge}
          disabled={loading || !selected || !!success}
          className="w-full py-3 rounded-xl bg-brand text-white text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? "처리 중..." : "충전하기"}
        </button>

        <p className="text-center text-xs text-gray-400">
          1P = 1원으로 환산됩니다.
        </p>
      </div>
    </div>
  )
}
