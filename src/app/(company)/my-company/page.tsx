"use client"

import { useState, useEffect, useRef } from "react"
import {
  Building2, Phone, MapPin, MessageCircle, FileText,
  Save, CheckCircle2, Pencil, X, ShieldCheck,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { PageHeader } from "@/components/ui/page-header"

interface CompanyData {
  id: string
  name: string
  licenseNumber: string
  businessRegistrationNumber: string | null
  phone: string
  address: string
  city: string
  district: string
  description: string | null
  kakaoOpenChatUrl: string | null
  status: string
  approvedAt: string | null
}

interface FormState {
  name: string
  phone: string
  address: string
  city: string
  district: string
  description: string
  kakaoOpenChatUrl: string
}

declare global {
  interface Window {
    daum: {
      Postcode: new (options: {
        oncomplete: (data: { address: string; sido: string; sigungu: string }) => void
      }) => { open: () => void }
    }
  }
}

export default function MyCompanyPage() {
  const [company, setCompany] = useState<CompanyData | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>({
    name: "", phone: "", address: "", city: "", district: "",
    description: "", kakaoOpenChatUrl: "",
  })
  const postcodeLoaded = useRef(false)

  useEffect(() => {
    fetch("/api/company/profile")
      .then((r) => r.json())
      .then((data) => {
        if (data.company) {
          setCompany(data.company)
          resetForm(data.company)
        }
      })
      .finally(() => setLoading(false))

    if (!postcodeLoaded.current) {
      const script = document.createElement("script")
      script.src = "//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js"
      script.async = true
      document.head.appendChild(script)
      postcodeLoaded.current = true
    }
  }, [])

  function resetForm(c: CompanyData) {
    setForm({
      name: c.name,
      phone: c.phone,
      address: c.address,
      city: c.city,
      district: c.district,
      description: c.description ?? "",
      kakaoOpenChatUrl: c.kakaoOpenChatUrl ?? "",
    })
  }

  function handleCancel() {
    if (company) resetForm(company)
    setEditing(false)
    setError(null)
  }

  function openPostcode() {
    if (typeof window.daum === "undefined") return
    new window.daum.Postcode({
      oncomplete(data) {
        setForm((prev) => ({
          ...prev,
          address: data.address,
          city: data.sido,
          district: data.sigungu,
        }))
      },
    }).open()
  }

  async function handleSave() {
    if (!form.name.trim()) { setError("업체명을 입력해 주세요."); return }
    if (!form.phone.trim()) { setError("연락처를 입력해 주세요."); return }
    if (!form.address.trim()) { setError("주소를 입력해 주세요."); return }
    if (form.kakaoOpenChatUrl && !form.kakaoOpenChatUrl.startsWith("https://open.kakao.com/")) {
      setError("올바른 카카오 오픈채팅 링크를 입력해 주세요.")
      return
    }

    setSaving(true)
    setError(null)
    try {
      const res = await fetch("/api/company/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          phone: form.phone,
          address: form.address,
          city: form.city,
          district: form.district,
          description: form.description || null,
          kakaoOpenChatUrl: form.kakaoOpenChatUrl || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? "저장 중 오류가 발생했습니다."); return }

      setCompany((prev) => prev ? { ...prev, ...data.company } : prev)
      setEditing(false)
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
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />
        ))}
      </div>
    )
  }

  if (!company) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <p className="text-sm text-gray-500">업체 정보를 불러올 수 없습니다.</p>
      </div>
    )
  }

  const statusLabel: Record<string, string> = {
    PENDING: "검토 중",
    APPROVED: "승인됨",
    REJECTED: "반려됨",
  }
  const statusColor: Record<string, string> = {
    PENDING: "bg-yellow-50 text-yellow-700 border-yellow-200",
    APPROVED: "bg-green-50 text-green-700 border-green-200",
    REJECTED: "bg-red-50 text-red-700 border-red-200",
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-start justify-between">
        <PageHeader title="업체 대표 정보" subtitle="업체 정보를 확인하고 수정합니다" />
        {!editing ? (
          <Button
            onClick={() => setEditing(true)}
            variant="outline"
            className="flex items-center gap-1.5 text-sm"
          >
            <Pencil className="w-3.5 h-3.5" />
            수정
          </Button>
        ) : (
          <button
            onClick={handleCancel}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
          >
            <X className="w-4 h-4" />
            취소
          </button>
        )}
      </div>

      {success && (
        <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          업체 정보가 저장되었습니다.
        </div>
      )}

      {/* 승인 상태 (읽기 전용) */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-6 space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
          <ShieldCheck className="w-4 h-4 text-brand" />
          승인 상태
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${statusColor[company.status] ?? "bg-gray-50 text-gray-600 border-gray-200"}`}>
            {statusLabel[company.status] ?? company.status}
          </span>
          {company.approvedAt && (
            <span className="text-xs text-gray-400">
              {new Date(company.approvedAt).toLocaleDateString("ko-KR")} 승인
            </span>
          )}
        </div>
      </div>

      {/* 등록 정보 (읽기 전용) */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-6 space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
          <FileText className="w-4 h-4 text-gray-400" />
          등록 정보 <span className="text-xs font-normal text-gray-400">(변경 불가)</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-xs text-gray-400">경비업 허가번호</p>
            <p className="text-sm font-medium text-gray-900">{company.licenseNumber}</p>
          </div>
          {company.businessRegistrationNumber && (
            <div className="space-y-1">
              <p className="text-xs text-gray-400">사업자등록번호</p>
              <p className="text-sm font-medium text-gray-900">{company.businessRegistrationNumber}</p>
            </div>
          )}
        </div>
      </div>

      {/* 편집 가능 정보 */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-6 space-y-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
          <Building2 className="w-4 h-4 text-brand" />
          업체 기본 정보
        </div>

        {/* 업체명 */}
        <div className="space-y-1.5">
          <Label htmlFor="name">업체명</Label>
          {editing ? (
            <Input
              id="name"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="업체명"
            />
          ) : (
            <p className="text-sm text-gray-900 py-2">{company.name}</p>
          )}
        </div>

        {/* 연락처 */}
        <div className="space-y-1.5">
          <Label htmlFor="phone">
            <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" />대표 연락처</span>
          </Label>
          {editing ? (
            <Input
              id="phone"
              value={form.phone}
              onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
              placeholder="010-0000-0000"
              type="tel"
            />
          ) : (
            <p className="text-sm text-gray-900 py-2">{company.phone}</p>
          )}
        </div>

        {/* 주소 */}
        <div className="space-y-1.5">
          <Label>
            <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" />업체 주소</span>
          </Label>
          {editing ? (
            <div className="flex gap-2">
              <Input
                value={form.address}
                readOnly
                placeholder="주소를 검색하세요"
                className="flex-1 bg-gray-50 cursor-pointer"
                onClick={openPostcode}
              />
              <Button type="button" variant="outline" className="shrink-0" onClick={openPostcode}>
                주소 검색
              </Button>
            </div>
          ) : (
            <p className="text-sm text-gray-900 py-2">{company.address || "—"}</p>
          )}
        </div>

        {/* 업체 소개 */}
        <div className="space-y-1.5">
          <Label htmlFor="description">업체 소개</Label>
          {editing ? (
            <Textarea
              id="description"
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              placeholder="업체 소개를 입력하세요 (선택)"
              rows={4}
            />
          ) : (
            <p className="text-sm text-gray-900 py-2 whitespace-pre-wrap">
              {company.description || <span className="text-gray-400">—</span>}
            </p>
          )}
        </div>
      </div>

      {/* 카카오 오픈채팅 */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-6 space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
          <MessageCircle className="w-4 h-4 text-yellow-500" />
          카카오 오픈채팅
        </div>
        {editing ? (
          <div className="space-y-1.5">
            <Label htmlFor="kakao">오픈채팅 URL</Label>
            <Input
              id="kakao"
              value={form.kakaoOpenChatUrl}
              onChange={(e) => setForm((p) => ({ ...p, kakaoOpenChatUrl: e.target.value }))}
              placeholder="https://open.kakao.com/o/..."
            />
            <p className="text-xs text-gray-400">
              경비 인력이 SOS 수락 전 문의할 수 있는 카카오 오픈채팅 링크입니다.
            </p>
          </div>
        ) : (
          <div>
            {company.kakaoOpenChatUrl ? (
              <a
                href={company.kakaoOpenChatUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-yellow-600 hover:underline break-all"
              >
                {company.kakaoOpenChatUrl}
              </a>
            ) : (
              <p className="text-sm text-gray-400">—</p>
            )}
          </div>
        )}
      </div>

      {/* 저장 버튼 */}
      {editing && (
        <div className="space-y-2">
          {error && (
            <p className="text-xs text-red-600 text-center">{error}</p>
          )}
          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full h-11 bg-brand hover:bg-blue-700 text-white font-semibold rounded-xl disabled:opacity-50"
          >
            {saving ? "저장 중..." : (
              <span className="flex items-center gap-2">
                <Save className="w-4 h-4" />
                저장하기
              </span>
            )}
          </Button>
        </div>
      )}
    </div>
  )
}
