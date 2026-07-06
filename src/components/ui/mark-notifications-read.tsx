"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function MarkNotificationsRead() {
  const router = useRouter()

  useEffect(() => {
    fetch("/api/notifications/read-all", { method: "POST" }).then(() => {
      router.refresh()
    })
  }, [router])

  return null
}
