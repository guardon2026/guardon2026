"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ADMIN_LABELS } from "@/lib/constants"

interface CompanyActionButtonsProps {
  companyId: string
}

export function CompanyActionButtons({ companyId }: CompanyActionButtonsProps) {
  const router = useRouter()
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showRejectForm, setShowRejectForm] = useState(false)
  const [rejectionReason, setRejectionReason] = useState("")

  const handleApprove = async () => {
    setProcessing(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/companies/${companyId}/approve`, {
        method: "POST",
      })
      if (!res.ok) throw new Error("승인 처리 중 오류가 발생했습니다.")
      router.push("/members")
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : "승인 처리 중 오류가 발생했습니다.")
    } finally {
      setProcessing(false)
    }
  }

  const handleRejectConfirm = async () => {
    const reason = rejectionReason.trim()
    if (!reason) {
      setError(ADMIN_LABELS.REJECTION_REASON_REQUIRED)
      return
    }
    setProcessing(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/companies/${companyId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rejectionReason: reason }),
      })
      if (!res.ok) throw new Error("반려 처리 중 오류가 발생했습니다.")
      router.push("/members")
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : "반려 처리 중 오류가 발생했습니다.")
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
          {error}
        </p>
      )}

      {!showRejectForm ? (
        <div className="flex gap-3">
          <button
            onClick={handleApprove}
            disabled={processing}
            className="px-6 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {processing ? "처리 중..." : ADMIN_LABELS.APPROVE}
          </button>
          <button
            onClick={() => setShowRejectForm(true)}
            disabled={processing}
            className="px-6 py-2.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            {ADMIN_LABELS.REJECT}
          </button>
        </div>
      ) : (
        <div className="space-y-3 border border-red-200 bg-red-50/50 rounded-xl p-4">
          <p className="text-sm font-medium text-red-800">반려 사유를 입력해 주세요.</p>
          <textarea
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder={ADMIN_LABELS.REJECTION_REASON_PLACEHOLDER}
            className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
            rows={3}
          />
          <div className="flex gap-2">
            <button
              onClick={handleRejectConfirm}
              disabled={!rejectionReason.trim() || processing}
              className="px-5 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              {processing ? "처리 중..." : ADMIN_LABELS.REJECT_CONFIRM}
            </button>
            <button
              onClick={() => {
                setShowRejectForm(false)
                setRejectionReason("")
                setError(null)
              }}
              disabled={processing}
              className="px-5 py-2 border border-gray-300 bg-white text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              취소
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
