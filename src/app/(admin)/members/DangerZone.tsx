"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { AlertTriangle } from "lucide-react"

const CONFIRM_TEXT = "전체삭제"

export default function DangerZone({ memberCount }: { memberCount: number }) {
  const router = useRouter()
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [result, setResult] = useState<Record<string, number> | null>(null)

  async function handleDelete() {
    if (input !== CONFIRM_TEXT) return
    if (!window.confirm(
      `정말로 관리자를 제외한 전체 회원 ${memberCount}명과 모든 SOS·계약·정산 데이터를 영구 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.`
    )) {
      return
    }

    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/admin/danger-delete-all-members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: "DELETE_ALL_MEMBERS" }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "삭제 중 오류가 발생했습니다.")
        return
      }
      setResult(data)
      setInput("")
      setTimeout(() => router.refresh(), 1500)
    } catch {
      setError("네트워크 오류가 발생했습니다.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-red-50 border border-red-200 rounded-2xl p-5 space-y-3">
      <div className="flex items-start gap-2.5">
        <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-bold text-red-800">위험 구역 — 전체 회원 삭제</p>
          <p className="text-xs text-red-700 mt-0.5">
            관리자를 제외한 전체 업체·경비 인력 계정({memberCount}명)과 연관된 SOS·계약서·정산 기록을
            전부 물리적으로 영구 삭제합니다. 백업이 없고 되돌릴 수 없습니다.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`확인을 위해 "${CONFIRM_TEXT}" 입력`}
          className="flex-1 px-3 py-2 rounded-lg border border-red-300 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
        />
        <button
          type="button"
          onClick={handleDelete}
          disabled={input !== CONFIRM_TEXT || loading}
          className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
        >
          {loading ? "삭제 중..." : "전체 회원 영구 삭제"}
        </button>
      </div>

      {error && <p className="text-xs text-red-700 font-medium">{error}</p>}
      {result && (
        <div className="text-xs text-red-800 bg-white/60 rounded-lg px-3 py-2 space-y-0.5">
          <p className="font-semibold">삭제 완료</p>
          {Object.entries(result).map(([key, value]) =>
            key === "ok" ? null : <p key={key}>{key}: {value}</p>
          )}
        </div>
      )}
    </div>
  )
}
