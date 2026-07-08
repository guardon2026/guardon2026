"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Send } from "lucide-react"

export default function SosApplicationForm({
  sosRequestId,
  applicantType,
  defaultContactName,
  defaultContactPhone,
  defaultContactEmail,
}: {
  sosRequestId: string
  applicantType: "COMPANY" | "GUARD"
  defaultContactName?: string | null
  defaultContactPhone?: string | null
  defaultContactEmail?: string | null
}) {
  const router = useRouter()
  const [availableHeadcount, setAvailableHeadcount] = useState(applicantType === "COMPANY" ? "1" : "")
  const [proposedRate, setProposedRate] = useState("")
  const [contactName, setContactName] = useState(defaultContactName ?? "")
  const [contactPhone, setContactPhone] = useState(defaultContactPhone ?? "")
  const [contactEmail, setContactEmail] = useState(defaultContactEmail ?? "")
  const [message, setMessage] = useState("")
  const [experienceSummary, setExperienceSummary] = useState("")
  const [profileConsent, setProfileConsent] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError("")
    setSuccess("")
    try {
      const res = await fetch(`/api/sos/requests/${sosRequestId}/applications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          availableHeadcount: applicantType === "COMPANY" ? Number(availableHeadcount) : 1,
          proposedRate: proposedRate ? Number(proposedRate.replace(/\D/g, "")) : null,
          contactName,
          contactPhone,
          contactEmail,
          message,
          experienceSummary,
          profileConsent,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "신청에 실패했습니다.")
        return
      }
      setSuccess("신청이 접수되었습니다.")
      router.refresh()
    } catch {
      setError("신청 처리 중 오류가 발생했습니다.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={submit} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
      <div>
        <p className="text-sm font-bold text-gray-900">SOS 신청</p>
        <p className="text-xs text-gray-500 mt-1">
          신청 후 게시 업체가 검토하면 연락처와 메시지를 확인하고 상태를 변경합니다.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {applicantType === "COMPANY" && (
          <label className="space-y-1">
            <span className="text-xs font-medium text-gray-600">투입 가능 인원</span>
            <input
              type="number"
              min={1}
              value={availableHeadcount}
              onChange={(e) => setAvailableHeadcount(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </label>
        )}
        <label className="space-y-1">
          <span className="text-xs font-medium text-gray-600">제안 단가</span>
          <input
            inputMode="numeric"
            value={proposedRate}
            onChange={(e) => setProposedRate(e.target.value.replace(/\D/g, ""))}
            placeholder="원"
            className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs font-medium text-gray-600">담당자명</span>
          <input
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs font-medium text-gray-600">연락처</span>
          <input
            value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value)}
            className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs font-medium text-gray-600">이메일</span>
          <input
            type="email"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
          />
        </label>
      </div>

      <label className="block space-y-1">
        <span className="text-xs font-medium text-gray-600">관련 경험</span>
        <textarea
          value={experienceSummary}
          onChange={(e) => setExperienceSummary(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
          placeholder="유사 현장, 투입 가능 조건, 보유 자격 등을 적어 주세요."
        />
      </label>

      <label className="block space-y-1">
        <span className="text-xs font-medium text-gray-600">메시지</span>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
          className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
          placeholder="담당자에게 전달할 내용을 입력하세요."
        />
      </label>

      <label className="flex items-start gap-2 text-sm text-gray-700">
        <input
          type="checkbox"
          checked={profileConsent}
          onChange={(e) => setProfileConsent(e.target.checked)}
          className="mt-0.5 rounded border-gray-300"
        />
        <span>게시 업체가 신청 검토를 위해 내 프로필과 연락처를 확인하는 데 동의합니다.</span>
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {success && <p className="text-sm text-green-700">{success}</p>}

      <button
        disabled={submitting}
        className="inline-flex items-center justify-center gap-1.5 h-10 px-4 rounded-lg bg-gray-900 text-white text-sm font-semibold disabled:opacity-50"
      >
        <Send className="w-4 h-4" />
        {submitting ? "신청 중..." : "신청 접수"}
      </button>
    </form>
  )
}
