"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

const LABELS: Record<string, string> = {
  REVIEWING: "검토",
  CONTACTED: "연락",
  SELECTED: "선정",
  REJECTED: "반려",
  CANCELLED: "취소",
}

export default function ApplicationStatusButton({
  applicationId,
  status,
}: {
  applicationId: string
  status: "REVIEWING" | "CONTACTED" | "SELECTED" | "REJECTED" | "CANCELLED"
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function update() {
    setLoading(true)
    try {
      const res = await fetch(`/api/sos/applications/${applicationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        alert(data.error ?? "상태 변경에 실패했습니다.")
        return
      }
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={update}
      disabled={loading}
      className="h-8 px-2.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
    >
      {loading ? "처리..." : LABELS[status]}
    </button>
  )
}
