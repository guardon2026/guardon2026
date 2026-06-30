"use client"

import { useState } from "react"
import { StatusDot } from "@/components/ui/status-dot"
import { AVAILABILITY_TOGGLE_LABELS } from "@/lib/constants"
import type { AvailabilityStatusKey } from "@/lib/constants"

interface Props {
  initialAvailability: AvailabilityStatusKey
}

export function AvailabilityToggle({ initialAvailability }: Props) {
  const [availability, setAvailability] = useState<AvailabilityStatusKey>(initialAvailability)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function toggle() {
    const next: AvailabilityStatusKey = availability === "AVAILABLE" ? "UNAVAILABLE" : "AVAILABLE"
    setLoading(true)
    setMessage(null)

    // 낙관적 업데이트 — 요청 전 즉시 UI 반영
    setAvailability(next)

    try {
      const res = await fetch("/api/worker/availability", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ availability: next }),
      })
      if (!res.ok) {
        // 실패 시 롤백
        setAvailability(availability)
        setMessage(AVAILABILITY_TOGGLE_LABELS.UPDATE_FAILED)
      } else {
        setMessage(AVAILABILITY_TOGGLE_LABELS.UPDATE_SUCCESS)
      }
    } catch {
      setAvailability(availability)
      setMessage(AVAILABILITY_TOGGLE_LABELS.UPDATE_FAILED)
    } finally {
      setLoading(false)
    }
  }

  const isAvailable = availability === "AVAILABLE"
  const isBusy = availability === "BUSY"
  const buttonLabel = isAvailable
    ? AVAILABILITY_TOGGLE_LABELS.SET_UNAVAILABLE
    : AVAILABILITY_TOGGLE_LABELS.SET_AVAILABLE

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <StatusDot status={availability} />
        <button
          onClick={toggle}
          disabled={loading || isBusy}
          className={
            isAvailable
              ? "px-4 py-2 rounded-lg text-sm font-semibold border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              : "px-4 py-2 rounded-lg text-sm font-semibold bg-brand text-white hover:opacity-90 disabled:opacity-50"
          }
        >
          {loading ? AVAILABILITY_TOGGLE_LABELS.UPDATING : buttonLabel}
        </button>
      </div>
      {message && (
        <p
          className={`text-xs ${
            message === AVAILABILITY_TOGGLE_LABELS.UPDATE_SUCCESS
              ? "text-brand"
              : "text-sos"
          }`}
        >
          {message}
        </p>
      )}
    </div>
  )
}
