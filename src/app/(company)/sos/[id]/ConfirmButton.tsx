"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { CheckCircle2, AlertTriangle, FileText } from "lucide-react"
import { SOS_DETAIL } from "@/lib/constants"

export default function ConfirmButton({
  sosRequestId,
  matchId,
  workerName,
  fullWidth = false,
}: {
  sosRequestId: string
  matchId: string
  workerName?: string
  fullWidth?: boolean
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [successMsg, setSuccessMsg] = useState("")
  const [showContractPrompt, setShowContractPrompt] = useState(false)

  async function handleConfirm() {
    setLoading(true)
    setError("")
    setSuccessMsg("")
    try {
      const res = await fetch(`/api/sos/matches/${matchId}/confirm`, {
        method: "POST",
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? "확정 중 오류가 발생했습니다.")
        return
      }
      const name = workerName ?? "경비 인력"
      setSuccessMsg(`${name}님이 정상적으로 확정되었습니다.`)
      setShowContractPrompt(true)
    } catch {
      setError("확정 중 오류가 발생했습니다.")
    } finally {
      setLoading(false)
    }
  }

  function closeContractPrompt() {
    setShowContractPrompt(false)
    router.refresh()
  }

  return (
    <>
      {showContractPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-amber-50 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-gray-900">근로계약서 작성이 필요합니다</h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {(workerName ?? "경비 인력")}님이 확정되었습니다. 근로기준법에 따라
                  근무 개시 전 근로계약서를 작성해야 합니다.
                </p>
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={closeContractPrompt}
                className="flex-1 h-11 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
              >
                나중에 하기
              </button>
              <Link
                href={`/sos/${sosRequestId}/contract/${matchId}`}
                className="flex-1 h-11 rounded-xl bg-brand text-white text-sm font-semibold hover:opacity-90 transition-opacity inline-flex items-center justify-center gap-1.5"
              >
                <FileText className="w-4 h-4" />
                계약서 작성하기
              </Link>
            </div>
          </div>
        </div>
      )}

      {successMsg ? (
        <div className={`flex items-center gap-2 px-3 py-2 rounded-xl bg-green-50 border border-green-200 text-green-700 text-sm font-medium ${fullWidth ? "w-full justify-center" : ""}`}>
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          {successMsg}
        </div>
      ) : (
        <div className={`flex flex-col gap-1 ${fullWidth ? "w-full" : "items-end"}`}>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className={`bg-green-600 text-white font-semibold hover:bg-green-700 transition-colors
                       disabled:opacity-60 disabled:cursor-not-allowed
                       ${fullWidth
                         ? "w-full py-3 rounded-xl text-sm"
                         : "shrink-0 px-3 py-1.5 rounded-lg text-xs"}`}
          >
            {loading ? "처리 중..." : SOS_DETAIL.CONFIRM_BUTTON}
          </button>
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
      )}
    </>
  )
}
