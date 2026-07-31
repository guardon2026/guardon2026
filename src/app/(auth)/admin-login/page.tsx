"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ShieldAlert } from "lucide-react"

export default function AdminLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setSubmitting(true)
    try {
      const res = await signIn("admin-credentials", {
        email: email.trim(),
        password,
        redirect: false,
      })
      if (!res || res.error) {
        setError("이메일 또는 비밀번호가 올바르지 않습니다.")
        return
      }
      router.push("/members")
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="mx-auto w-12 h-12 rounded-xl bg-gray-900 flex items-center justify-center">
              <ShieldAlert className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">관리자 로그인</h1>
            <p className="text-sm text-gray-500">GuardOn 관리자 계정으로 로그인합니다.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">이메일</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="username"
                className="w-full h-11 px-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">비밀번호</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full h-11 px-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
              />
            </div>
            {error && <p className="text-xs text-sos">{error}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="w-full h-11 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {submitting ? "로그인 중..." : "로그인"}
            </button>
          </form>

          <p className="text-center text-xs text-gray-400">
            <Link href="/login" className="hover:text-gray-600 transition-colors">일반 로그인으로 돌아가기</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
