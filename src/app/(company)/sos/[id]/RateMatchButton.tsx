"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Star } from "lucide-react"

export default function RateMatchButton({
  matchId,
  existingScore,
}: {
  matchId: string
  existingScore: number | null
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [score, setScore] = useState(0)
  const [comment, setComment] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit() {
    if (score < 1) return
    setLoading(true)
    setError("")
    try {
      const res = await fetch(`/api/sos/matches/${matchId}/rate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ score, comment: comment.trim() || undefined }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? "오류가 발생했습니다.")
        return
      }
      router.refresh()
    } catch {
      setError("네트워크 오류가 발생했습니다.")
    } finally {
      setLoading(false)
    }
  }

  if (existingScore !== null) {
    return (
      <div className="flex items-center gap-1 text-xs text-gray-500">
        {[1, 2, 3, 4, 5].map((n) => (
          <Star
            key={n}
            className={`w-3.5 h-3.5 ${n <= existingScore ? "text-amber-400 fill-amber-400" : "text-gray-200 fill-gray-200"}`}
          />
        ))}
        <span className="ml-1">평가 완료</span>
      </div>
    )
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs font-medium text-brand hover:underline"
      >
        근무 평가하기
      </button>
    )
  }

  return (
    <div className="flex flex-col gap-1.5 items-end w-full max-w-[220px]">
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" onClick={() => setScore(n)}>
            <Star
              className={`w-4 h-4 ${n <= score ? "text-amber-400 fill-amber-400" : "text-gray-200 fill-gray-200"}`}
            />
          </button>
        ))}
      </div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="근무 평가 코멘트 (선택)"
        rows={2}
        className="w-full text-xs px-2 py-1.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand/30"
      />
      <button
        type="button"
        onClick={handleSubmit}
        disabled={score < 1 || loading}
        className="px-3 py-1.5 rounded-lg bg-brand text-white text-xs font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "처리 중..." : "평가 등록"}
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
