"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { AlertTriangle } from "lucide-react"

export default function WithdrawSection() {
  const router = useRouter()
  const [showWithdraw, setShowWithdraw] = useState(false)
  const [withdrawConfirm, setWithdrawConfirm] = useState("")
  const [withdrawing, setWithdrawing] = useState(false)
  const [withdrawError, setWithdrawError] = useState<string | null>(null)

  async function handleWithdraw() {
    if (withdrawConfirm !== "탈퇴") return
    setWithdrawing(true)
    setWithdrawError(null)
    try {
      const res = await fetch("/api/auth/withdraw", { method: "DELETE" })
      const data = await res.json()
      if (!res.ok) {
        setWithdrawError(data.error ?? "탈퇴 처리 중 오류가 발생했습니다.")
        return
      }
      router.push("/login")
    } catch {
      setWithdrawError("네트워크 오류가 발생했습니다.")
    } finally {
      setWithdrawing(false)
    }
  }

  return (
    <>
      <div className="pt-2 pb-6 text-center">
        <button
          onClick={() => { setShowWithdraw(true); setWithdrawConfirm(""); setWithdrawError(null) }}
          className="text-sm text-red-500 hover:text-red-700 hover:underline transition-colors"
        >
          회원 탈퇴
        </button>
      </div>

      {showWithdraw && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-6 space-y-5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">회원 탈퇴</h3>
                <p className="text-sm text-gray-500 mt-1 leading-relaxed">
                  탈퇴하면 프로필, 자격증, 이력 등 모든 데이터에 접근할 수 없게 됩니다.
                  이 작업은 되돌릴 수 없습니다.
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm text-gray-700">
                확인을 위해 <span className="font-bold text-red-600">탈퇴</span>를 입력해 주세요.
              </label>
              <input
                type="text"
                value={withdrawConfirm}
                onChange={(e) => { setWithdrawConfirm(e.target.value); setWithdrawError(null) }}
                placeholder="탈퇴"
                className="w-full h-10 px-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
              />
              {withdrawError && (
                <p className="text-xs text-red-600">{withdrawError}</p>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowWithdraw(false)}
                className="flex-1 h-10 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleWithdraw}
                disabled={withdrawConfirm !== "탈퇴" || withdrawing}
                className="flex-1 h-10 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {withdrawing ? "처리 중..." : "탈퇴하기"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
