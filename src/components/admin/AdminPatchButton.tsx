"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export function AdminPatchButton({
  endpoint,
  body,
  label,
  variant = "default",
}: {
  endpoint: string
  body: Record<string, unknown>
  label: string
  variant?: "default" | "danger"
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function run() {
    setLoading(true)
    try {
      const res = await fetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        alert(data.error ?? "처리에 실패했습니다.")
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
      onClick={run}
      disabled={loading}
      className={`h-8 px-2.5 rounded-lg border text-xs font-medium disabled:opacity-50 ${
        variant === "danger"
          ? "border-red-200 text-red-700 hover:bg-red-50"
          : "border-gray-200 text-gray-700 hover:bg-gray-50"
      }`}
    >
      {loading ? "처리..." : label}
    </button>
  )
}
