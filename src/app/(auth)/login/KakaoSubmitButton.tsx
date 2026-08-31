"use client"

import { useRef, useState } from "react"
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
  const clickedRef = useRef(false)

  return (
    <button
      type="submit"
      aria-disabled={submitting}
      onClick={(e) => {
        if (clickedRef.current) {
          e.preventDefault()
          return
        }
        clickedRef.current = true
        // 이 클릭 자체의 네이티브 form submit이 끝난 뒤(다음 tick)에 비활성 표시로
        // 전환한다 — onClick 안에서 곧바로 disabled를 켜면 브라우저가 이 클릭의
        // submit 자체를 취소해버려 로그인이 아예 되지 않는다.
        setTimeout(() => setSubmitting(true), 0)
      }}
      className={`${className} ${submitting ? "opacity-60 cursor-not-allowed pointer-events-none" : ""}`}
    >
      {submitting ? pendingLabel : children}
    </button>
  )
}
