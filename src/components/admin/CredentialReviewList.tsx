"use client"

import { useState } from "react"
import { ExternalLink } from "lucide-react"
import { ADMIN_LABELS, CREDENTIAL_TYPE_LABELS } from "@/lib/constants"

interface WorkerUser {
  name: string
  phone: string | null
}

interface WorkerProfile {
  user: WorkerUser
}

export interface CredentialWithWorker {
  id: string
  type: string
  documentUrl: string
  createdAt: Date
  workerProfile: WorkerProfile
}

interface CredentialReviewListProps {
  credentials: CredentialWithWorker[]
}

export function CredentialReviewList({ credentials }: CredentialReviewListProps) {
  const [processing, setProcessing] = useState<string | null>(null)
  const [activeReject, setActiveReject] = useState<string | null>(null)
  const [rejectionReason, setRejectionReason] = useState("")
  const [localList, setLocalList] = useState(credentials)

  const handleApprove = async (credentialId: string) => {
    setProcessing(credentialId)
    try {
      const res = await fetch(`/api/admin/credentials/${credentialId}/approve`, {
        method: "POST",
      })
      if (!res.ok) throw new Error("승인 처리 중 오류가 발생했습니다.")
      setLocalList((prev) => prev.filter((c) => c.id !== credentialId))
    } finally {
      setProcessing(null)
    }
  }

  const handleReject = async (credentialId: string) => {
    const reason = rejectionReason.trim()
    if (!reason) return
    setProcessing(credentialId)
    try {
      const res = await fetch(`/api/admin/credentials/${credentialId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rejectionReason: reason }),
      })
      if (!res.ok) throw new Error("반려 처리 중 오류가 발생했습니다.")
      setLocalList((prev) => prev.filter((c) => c.id !== credentialId))
      setActiveReject(null)
      setRejectionReason("")
    } finally {
      setProcessing(null)
    }
  }

  if (localList.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm text-center py-12 text-gray-400">
        {ADMIN_LABELS.EMPTY_PENDING}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {localList.map((cred) => (
        <div key={cred.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-base font-semibold text-gray-900">
                {CREDENTIAL_TYPE_LABELS[cred.type] ?? cred.type}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                {cred.workerProfile.user.name}
                {cred.workerProfile.user.phone && (
                  <span className="text-gray-400"> · {cred.workerProfile.user.phone}</span>
                )}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                제출일: {new Date(cred.createdAt).toLocaleDateString("ko-KR")}
              </p>
            </div>
            <a
              href={cred.documentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors shrink-0"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              {ADMIN_LABELS.DOCUMENT_VIEW}
            </a>
          </div>

          {/* 반려 사유 입력 인라인 폼 */}
          {activeReject === cred.id ? (
            <div className="mt-4 border border-red-200 bg-red-50/50 rounded-xl p-4 space-y-3">
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
                  onClick={() => handleReject(cred.id)}
                  disabled={!rejectionReason.trim() || processing === cred.id}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {processing === cred.id ? "처리 중..." : ADMIN_LABELS.REJECT_CONFIRM}
                </button>
                <button
                  onClick={() => {
                    setActiveReject(null)
                    setRejectionReason("")
                  }}
                  className="px-4 py-2 border border-gray-300 bg-white text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  취소
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => handleApprove(cred.id)}
                disabled={processing === cred.id}
                className="px-5 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                {processing === cred.id ? "처리 중..." : ADMIN_LABELS.APPROVE}
              </button>
              <button
                onClick={() => setActiveReject(cred.id)}
                disabled={processing === cred.id}
                className="px-5 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {ADMIN_LABELS.REJECT}
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
