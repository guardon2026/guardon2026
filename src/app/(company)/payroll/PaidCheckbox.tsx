"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export default function PaidCheckbox({
  matchId,
  initialPaid,
}: {
  matchId: string
  initialPaid: boolean
}) {
  const router = useRouter()
  const [checked, setChecked] = useState(initialPaid)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleChange(next: boolean) {
    setChecked(next)
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/sos/matches/${matchId}/mark-paid`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paid: next }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? "처리 중 오류가 발생했습니다.")
        setChecked(!next)
        return
      }
      router.refresh()
    } catch {
      setError("네트워크 오류가 발생했습니다.")
      setChecked(!next)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={checked}
          disabled={loading}
          onChange={(e) => handleChange(e.target.checked)}
          className="w-4 h-4 rounded border-gray-300 text-brand focus:ring-brand disabled:opacity-50"
        />
        지급 완료
      </label>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
