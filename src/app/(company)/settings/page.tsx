"use client"

import { useState, useEffect } from "react"
import { MessageCircle, Save, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PageHeader } from "@/components/ui/page-header"

export default function CompanySettingsPage() {
  const [kakaoUrl, setKakaoUrl] = useState("")
  const [original, setOriginal] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    fetch("/api/company/profile")
      .then((r) => r.json())
      .then((data) => {
        const url = data.company?.kakaoOpenChatUrl ?? ""
        setKakaoUrl(url)
        setOriginal(url)
      })
      .finally(() => setLoading(false))
  }, [])

  async function handleSave() {
    setSaving(true)
    setError(null)
    setSuccess(false)
    try {
      const res = await fetch("/api/company/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kakaoOpenChatUrl: kakaoUrl || null }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "저장 중 오류가 발생했습니다.")
        return
      }
      setOriginal(data.company.kakaoOpenChatUrl ?? "")
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch {
      setError("네트워크 오류가 발생했습니다.")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-xl mx-auto px-4 py-8">
        <div className="h-6 w-32 bg-gray-100 rounded animate-pulse" />
      </div>
    )
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-8 space-y-6">
      <PageHeader title="업체 설정" subtitle="업체 연락처 및 문의 채널을 관리합니다" />

      <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-6 space-y-5">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-yellow-500" />
          <p className="text-sm font-semibold text-gray-700">카카오 오픈채팅 링크</p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="kakaoUrl">오픈채팅 URL</Label>
          <Input
            id="kakaoUrl"
            value={kakaoUrl}
            onChange={(e) => { setKakaoUrl(e.target.value); setError(null) }}
            placeholder="https://open.kakao.com/o/..."
            className={error ? "border-red-300 bg-red-50" : ""}
          />
          {error && <p className="text-xs text-red-600">{error}</p>}
          <p className="text-xs text-gray-400">
            경비 인력이 SOS 요청 수락 전 업체에 문의할 수 있는 카카오 오픈채팅 링크입니다.
            카카오톡 앱 → 채팅 탭 → 오픈채팅에서 링크를 복사하세요.
          </p>
        </div>

        {kakaoUrl && (
          <a
            href={kakaoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-yellow-600 hover:underline"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            링크 미리보기
          </a>
        )}

        <Button
          onClick={handleSave}
          disabled={saving || kakaoUrl === original}
          className="w-full h-11 bg-brand hover:bg-blue-700 text-white font-semibold rounded-xl disabled:opacity-50"
        >
          {saving ? (
            "저장 중..."
          ) : success ? (
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              저장되었습니다
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Save className="w-4 h-4" />
              저장하기
            </span>
          )}
        </Button>
      </div>
    </div>
  )
}
