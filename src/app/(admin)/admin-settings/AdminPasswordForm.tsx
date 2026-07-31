"use client"

import { useState } from "react"
import { KeyRound } from "lucide-react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"

export default function AdminPasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setSuccess(false)

    if (newPassword.length < 8) {
      setError("새 비밀번호는 8자 이상이어야 합니다.")
      return
    }
    if (newPassword !== confirmPassword) {
      setError("새 비밀번호가 일치하지 않습니다.")
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch("/api/admin/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "비밀번호 변경에 실패했습니다.")
        return
      }
      setSuccess(true)
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
    } catch {
      setError("비밀번호 변경 중 오류가 발생했습니다.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6 space-y-5">
      <div className="flex items-center gap-2">
        <KeyRound className="w-5 h-5 text-brand" />
        <h2 className="text-base font-bold text-gray-900">비밀번호 변경</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div className="space-y-1.5">
          <Label htmlFor="currentPassword">현재 비밀번호</Label>
          <Input
            id="currentPassword"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            autoComplete="current-password"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="newPassword">새 비밀번호</Label>
          <Input
            id="newPassword"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
            placeholder="8자 이상"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="confirmPassword">새 비밀번호 확인</Label>
          <Input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
          />
        </div>

        {error && <p className="text-xs text-sos">{error}</p>}
        {success && <p className="text-xs text-green-600">비밀번호가 변경되었습니다.</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full h-11 bg-brand text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {submitting ? "변경 중..." : "비밀번호 변경"}
        </button>
      </form>
    </div>
  )
}
