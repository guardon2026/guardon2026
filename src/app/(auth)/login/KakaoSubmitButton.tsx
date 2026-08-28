"use client"

import { useState } from "react"
import type { ReactNode } from "react"

export function KakaoSubmitButton({
  children,
  pendingLabel,
  className,
}: {
  children: ReactNode
  pendingLabel: string
  className: string
}) {
  const [submitting, setSubmitting] = useState(false)

  return (
    <button
      type="submit"
      disabled={submitting}
      onClick={() => setSubmitting(true)}
      className={`${className} disabled:opacity-60 disabled:cursor-not-allowed`}
    >
      {submitting ? pendingLabel : children}
    </button>
  )
}
