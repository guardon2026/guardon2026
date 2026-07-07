"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { XCircle } from "lucide-react"

interface Props {
  sosRequestId: string
  confirmedCount: number
  hourlyRate: number
}

export default function CancelButton({ sosRequestId, confirmedCount, hourlyRate }: Props) {
  const router = useRouter()
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const penaltyPerWorker = Math.ceil(hourlyRate * 0.1)
  const totalPenalty = confirmedCount * penaltyPerWorker

  async function handleCancel() {
    setLoading(true)
    setError("")
    try {
      const res = await fetch(`/api/sos/requests/${sosRequestId}/cancel`, { method: "POST" })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "취소 처리 중 오류가 발생했습니다.")
        return
      }
      router.push("/sos")
      router.refresh()
    } catch {
      setError("네트워크 오류가 발생했습니다.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setShowConfirm(true)}
        className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-red-300
                   text-sm text-red-600 font-semibold hover:bg-red-50 transition-colors"
      >
        <XCircle className="w-4 h-4" />
        요청 취소
      </button>

      {/* 확인 모달 */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => !loading && setShowConfirm(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6 space-y-4">
            <h2 className="text-base font-bold text-gray-900">SOS 요청 취소</h2>

            {confirmedCount === 0 ? (
              <p className="text-sm text-gray-600">
                확정된 인력이 없어 <span className="font-semibold text-gray-900">즉시 취소</span>되며
                결제 포인트가 <span className="font-semibold text-green-600">전액 환불</span>됩니다.
              </p>
            ) : (
              <div className="space-y-2 text-sm text-gray-600">
                <p>
                  확정된 인력 <span className="font-semibold text-gray-900">{confirmedCount}명</span>이 있습니다.
                </p>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-1 text-xs">
                  <p className="font-semibold text-amber-800">위약금 안내</p>
                  <p className="text-amber-700">• 인당 위약금: 인건비의 10% = {penaltyPerWorker.toLocaleString()}P</p>
                  <p className="text-amber-700">• 총 위약금: {totalPenalty.toLocaleString()}P ({confirmedCount}명)</p>
                  <p className="text-amber-700">• 위약금은 각 확정 인력의 포인트로 지급됩니다.</p>
                </div>
              </div>
            )}

            {error && <p className="text-xs text-red-600">{error}</p>}

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                disabled={loading}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                돌아가기
              </button>
              <button
                type="button"
                onClick={handleCancel}
                disabled={loading}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-60"
              >
                {loading ? "처리 중..." : "취소 확정"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
