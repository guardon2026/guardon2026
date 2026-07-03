"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Script from "next/script"
import Image from "next/image"
import { Camera } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { PageHeader } from "@/components/ui/page-header"
import {
  WORKER_PROFILE,
  WORK_FIELD_LABELS,
  CREDENTIAL_LABELS,
  SOS_WORK_FIELD_OPTIONS,
  SOS_CREDENTIAL_OPTIONS,
  type WorkFieldKey,
} from "@/lib/constants"
import { cn } from "@/lib/utils"

type CredentialKey = (typeof SOS_CREDENTIAL_OPTIONS)[number]

const ALL_WORK_FIELDS = SOS_WORK_FIELD_OPTIONS as unknown as WorkFieldKey[]
const ALL_CREDENTIALS = SOS_CREDENTIAL_OPTIONS as unknown as CredentialKey[]

declare global {
  interface Window {
    daum?: {
      Postcode: new (options: {
        oncomplete: (data: {
          roadAddress: string
          jibunAddress: string
          sido: string
          sigungu: string
        }) => void
      }) => { open: () => void }
    }
  }
}

interface FormState {
  workFields: WorkFieldKey[]
  declaredCredentials: CredentialKey[]
  experienceYears: string
  height: string
  weight: string
  address: string
  city: string
  district: string
  desiredHourlyRate: string
  bio: string
}

interface FormErrors {
  workFields?: string
  address?: string
  city?: string
  district?: string
  experienceYears?: string
  desiredHourlyRate?: string
  avatar?: string
  general?: string
}

export default function ProfileEditPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarUploading, setAvatarUploading] = useState(false)

  const [form, setForm] = useState<FormState>({
    workFields: [],
    declaredCredentials: [],
    experienceYears: "0",
    height: "",
    weight: "",
    address: "",
    city: "",
    district: "",
    desiredHourlyRate: "",
    bio: "",
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [daumReady, setDaumReady] = useState(false)

  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await fetch("/api/worker/profile")
        if (res.ok) {
          const data = await res.json()
          if (data.profile) {
            const p = data.profile
            setProfileImageUrl(p.profileImageUrl ?? null)
            setForm({
              workFields: (p.workFields ?? []) as WorkFieldKey[],
              declaredCredentials: (p.declaredCredentials ?? []) as CredentialKey[],
              experienceYears: String(p.experienceYears ?? 0),
              height: p.height != null ? String(p.height) : "",
              weight: p.weight != null ? String(p.weight) : "",
              address: p.address ?? "",
              city: p.city ?? "",
              district: p.district ?? "",
              desiredHourlyRate: p.desiredHourlyRate != null ? String(p.desiredHourlyRate) : "",
              bio: p.bio ?? "",
            })
          }
        }
      } catch {
        // ignore
      } finally {
        setIsLoading(false)
      }
    }
    loadProfile()
  }, [])

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setErrors((prev) => ({ ...prev, avatar: "JPG, PNG, WEBP 파일만 가능합니다." }))
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrors((prev) => ({ ...prev, avatar: "파일 크기는 5MB 이하여야 합니다." }))
      return
    }
    setErrors((prev) => ({ ...prev, avatar: undefined }))
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  async function uploadAvatar(): Promise<string | null> {
    if (!avatarFile) return profileImageUrl
    setAvatarUploading(true)
    try {
      const fd = new FormData()
      fd.append("file", avatarFile)
      const res = await fetch("/api/worker/profile/avatar", { method: "POST", body: fd })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setErrors((prev) => ({ ...prev, avatar: d.error ?? "사진 업로드에 실패했습니다." }))
        return null
      }
      const { url } = await res.json()
      return url
    } catch {
      setErrors((prev) => ({ ...prev, avatar: "사진 업로드에 실패했습니다." }))
      return null
    } finally {
      setAvatarUploading(false)
    }
  }

  function openDaumPostcode() {
    if (!daumReady || !window.daum?.Postcode) {
      alert("주소 검색 서비스를 불러오는 중입니다. 잠시 후 다시 시도해 주세요.")
      return
    }
    new window.daum.Postcode({
      oncomplete(data) {
        const fullAddress = data.roadAddress || data.jibunAddress
        setForm((prev) => ({ ...prev, address: fullAddress, city: data.sido, district: data.sigungu }))
        setErrors((prev) => ({ ...prev, address: undefined, city: undefined, district: undefined }))
      },
    }).open()
  }

  function toggleWorkField(field: WorkFieldKey) {
    setForm((prev) => ({
      ...prev,
      workFields: prev.workFields.includes(field)
        ? prev.workFields.filter((f) => f !== field)
        : [...prev.workFields, field],
    }))
  }

  function toggleCredential(cred: CredentialKey) {
    setForm((prev) => ({
      ...prev,
      declaredCredentials: prev.declaredCredentials.includes(cred)
        ? prev.declaredCredentials.filter((c) => c !== cred)
        : [...prev.declaredCredentials, cred],
    }))
  }

  function validate(): FormErrors {
    const errs: FormErrors = {}
    if (form.workFields.length === 0) errs.workFields = WORKER_PROFILE.ERROR.WORK_FIELDS_REQUIRED
    if (!form.address.trim()) errs.address = WORKER_PROFILE.ERROR.ADDRESS_REQUIRED
    if (!form.city.trim()) errs.city = WORKER_PROFILE.ERROR.CITY_REQUIRED
    if (!form.district.trim()) errs.district = WORKER_PROFILE.ERROR.DISTRICT_REQUIRED
    const expNum = Number(form.experienceYears)
    if (isNaN(expNum) || expNum < 0 || !Number.isInteger(expNum)) errs.experienceYears = WORKER_PROFILE.ERROR.EXPERIENCE_INVALID
    if (form.desiredHourlyRate !== "") {
      const rateNum = Number(form.desiredHourlyRate)
      if (isNaN(rateNum) || rateNum < 0) errs.desiredHourlyRate = WORKER_PROFILE.ERROR.HOURLY_RATE_INVALID
    }
    return errs
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errs = validate()
    setErrors(errs)
    if (Object.keys(errs).length > 0) return

    setIsSubmitting(true)
    setSuccessMsg(null)
    try {
      // 사진 먼저 업로드
      const newAvatarUrl = await uploadAvatar()
      if (avatarFile && newAvatarUrl === null) {
        setIsSubmitting(false)
        return
      }

      const body: Record<string, unknown> = {
        workFields: form.workFields,
        declaredCredentials: form.declaredCredentials,
        experienceYears: Number(form.experienceYears),
        address: form.address.trim(),
        city: form.city.trim(),
        district: form.district.trim(),
        height: form.height !== "" ? Number(form.height) : null,
        weight: form.weight !== "" ? Number(form.weight) : null,
        bio: form.bio.trim() || null,
        desiredHourlyRate: form.desiredHourlyRate !== "" ? Number(form.desiredHourlyRate) : null,
      }

      const res = await fetch("/api/worker/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        if (res.status === 404) {
          const createRes = await fetch("/api/worker/profile", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          })
          if (!createRes.ok) { setErrors({ general: WORKER_PROFILE.ERROR.SAVE_FAILED }); return }
        } else {
          const data = await res.json().catch(() => ({}))
          setErrors({ general: data.error ?? WORKER_PROFILE.ERROR.SAVE_FAILED })
          return
        }
      }

      setSuccessMsg(WORKER_PROFILE.SUCCESS)
      setTimeout(() => {
        setSuccessMsg(null)
        router.push("/profile")
        router.refresh()
      }, 2000)
    } catch {
      setErrors({ general: WORKER_PROFILE.ERROR.SAVE_FAILED })
    } finally {
      setIsSubmitting(false)
    }
  }

  const displayImage = avatarPreview ?? profileImageUrl

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <p className="text-sm text-gray-500">불러오는 중...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-10">
      <Script
        src="https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js"
        strategy="lazyOnload"
        onLoad={() => setDaumReady(true)}
      />
      {successMsg && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-5 py-3 bg-green-600 text-white text-sm font-semibold rounded-xl shadow-lg animate-in fade-in slide-in-from-top-2">
          {successMsg}
        </div>
      )}

      <PageHeader
        title="프로필 수정"
        subtitle={WORKER_PROFILE.PAGE_SUBTITLE}
        action={
          <button
            type="button"
            form="profile-edit-form"
            disabled={isSubmitting || avatarUploading}
            onClick={() => {
              const f = document.getElementById("profile-edit-form") as HTMLFormElement
              f?.requestSubmit()
            }}
            className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-semibold bg-brand text-white hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {isSubmitting ? WORKER_PROFILE.SUBMITTING : WORKER_PROFILE.SUBMIT_BUTTON}
          </button>
        }
      />

      <form id="profile-edit-form" onSubmit={handleSubmit} className="space-y-6" noValidate>

        {/* 프로필 사진 */}
        <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6 flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-100 border-2 border-gray-200 flex items-center justify-center">
              {displayImage ? (
                <Image src={displayImage} alt="프로필 사진" width={96} height={96} className="object-cover w-full h-full" unoptimized />
              ) : (
                <Camera className="w-8 h-8 text-gray-300" />
              )}
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-brand text-white flex items-center justify-center shadow hover:opacity-90 transition-opacity"
            >
              <Camera className="w-3.5 h-3.5" />
            </button>
          </div>
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleAvatarChange} />
          <p className="text-xs text-gray-400">JPG, PNG, WEBP · 최대 5MB</p>
          {errors.avatar && <p className="text-xs text-sos">{errors.avatar}</p>}
        </div>

        {/* 경력 사항 */}
        <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">경력 사항</h2>
          <div className="space-y-1.5">
            <Label htmlFor="experienceYears">{WORKER_PROFILE.FIELDS.EXPERIENCE_LABEL}</Label>
            <div className="flex items-center gap-2">
              <Input
                id="experienceYears"
                type="number"
                min={0}
                value={form.experienceYears}
                onChange={(e) => setForm((p) => ({ ...p, experienceYears: e.target.value }))}
                placeholder={WORKER_PROFILE.FIELDS.EXPERIENCE_PLACEHOLDER}
                className="w-28"
              />
              <span className="text-sm text-gray-600">{WORKER_PROFILE.FIELDS.EXPERIENCE_UNIT}</span>
            </div>
            {errors.experienceYears && <p className="text-xs text-sos">{errors.experienceYears}</p>}
          </div>

          {/* 키 / 몸무게 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="height">키 (선택)</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="height"
                  type="number"
                  min={100}
                  max={250}
                  value={form.height}
                  onChange={(e) => setForm((p) => ({ ...p, height: e.target.value }))}
                  placeholder="예) 175"
                  className="w-28"
                />
                <span className="text-sm text-gray-600">cm</span>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="weight">몸무게 (선택)</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="weight"
                  type="number"
                  min={30}
                  max={200}
                  value={form.weight}
                  onChange={(e) => setForm((p) => ({ ...p, weight: e.target.value }))}
                  placeholder="예) 75"
                  className="w-28"
                />
                <span className="text-sm text-gray-600">kg</span>
              </div>
            </div>
          </div>
        </div>

        {/* 전문 분야 */}
        <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6 space-y-3">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">전문 분야</h2>
          <p className="text-xs text-gray-500">{WORKER_PROFILE.FIELDS.WORK_FIELDS_HINT}</p>
          <div className="flex flex-wrap gap-2">
            {ALL_WORK_FIELDS.map((field) => {
              const selected = form.workFields.includes(field)
              return (
                <button
                  key={field}
                  type="button"
                  onClick={() => toggleWorkField(field)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-sm font-medium border transition-colors",
                    selected
                      ? "bg-brand text-white border-brand"
                      : "bg-white text-gray-600 border-gray-300 hover:border-brand hover:text-brand",
                  )}
                >
                  {WORK_FIELD_LABELS[field]}
                </button>
              )
            })}
          </div>
          {errors.workFields && <p className="text-xs text-sos">{errors.workFields}</p>}
        </div>

        {/* 보유 자격증 */}
        <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6 space-y-3">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">보유 자격증</h2>
          <p className="text-xs text-gray-500">보유한 자격증을 모두 선택해 주세요.</p>
          <div className="flex flex-wrap gap-2">
            {ALL_CREDENTIALS.map((cred) => {
              const selected = form.declaredCredentials.includes(cred)
              return (
                <button
                  key={cred}
                  type="button"
                  onClick={() => toggleCredential(cred)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-sm font-medium border transition-colors",
                    selected
                      ? "bg-brand text-white border-brand"
                      : "bg-white text-gray-600 border-gray-300 hover:border-brand hover:text-brand",
                  )}
                >
                  {CREDENTIAL_LABELS[cred] ?? cred}
                </button>
              )
            })}
          </div>
        </div>

        {/* 기본 정보 */}
        <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">기본 정보</h2>

          <div className="space-y-1.5">
            <Label htmlFor="address">{WORKER_PROFILE.FIELDS.ADDRESS_LABEL}</Label>
            <div className="flex gap-2">
              <Input
                id="address"
                type="text"
                value={form.address}
                readOnly
                placeholder="주소 검색 버튼을 눌러 주세요"
                className="flex-1 bg-gray-50 cursor-default"
              />
              <button
                type="button"
                onClick={openDaumPostcode}
                className="px-4 py-2 rounded-xl border border-brand text-brand text-sm font-semibold hover:bg-blue-50 transition-colors shrink-0"
              >
                주소 검색
              </button>
            </div>
            {errors.address && <p className="text-xs text-sos">{errors.address}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="city">{WORKER_PROFILE.FIELDS.CITY_LABEL}</Label>
              <Input id="city" type="text" value={form.city} readOnly placeholder="자동 입력" className="bg-gray-50 cursor-default" />
              {errors.city && <p className="text-xs text-sos">{errors.city}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="district">{WORKER_PROFILE.FIELDS.DISTRICT_LABEL}</Label>
              <Input id="district" type="text" value={form.district} readOnly placeholder="자동 입력" className="bg-gray-50 cursor-default" />
              {errors.district && <p className="text-xs text-sos">{errors.district}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="desiredHourlyRate">{WORKER_PROFILE.FIELDS.HOURLY_RATE_LABEL}</Label>
            <div className="flex items-center gap-2">
              <Input
                id="desiredHourlyRate"
                type="number"
                min={0}
                value={form.desiredHourlyRate}
                onChange={(e) => setForm((p) => ({ ...p, desiredHourlyRate: e.target.value }))}
                placeholder={WORKER_PROFILE.FIELDS.HOURLY_RATE_PLACEHOLDER}
                className="w-36"
              />
              <span className="text-sm text-gray-600">원/시간</span>
            </div>
            {errors.desiredHourlyRate && <p className="text-xs text-sos">{errors.desiredHourlyRate}</p>}
          </div>
        </div>

        {/* 소개 */}
        <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6 space-y-3">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">소개</h2>
          <div className="space-y-1.5">
            <Label htmlFor="bio">{WORKER_PROFILE.FIELDS.BIO_LABEL}</Label>
            <div className="relative">
              <Textarea
                id="bio"
                value={form.bio}
                onChange={(e) => { if (e.target.value.length <= 500) setForm((p) => ({ ...p, bio: e.target.value })) }}
                placeholder={WORKER_PROFILE.FIELDS.BIO_PLACEHOLDER}
                rows={5}
                maxLength={500}
              />
              <span className="absolute bottom-2 right-3 text-xs text-gray-400 select-none">{form.bio.length}/500</span>
            </div>
          </div>
        </div>

        {errors.general && <p className="text-sm text-sos text-center">{errors.general}</p>}

        <button
          type="submit"
          disabled={isSubmitting || avatarUploading}
          className="w-full py-3 rounded-xl text-sm font-semibold bg-brand text-white hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {isSubmitting ? WORKER_PROFILE.SUBMITTING : WORKER_PROFILE.SUBMIT_BUTTON}
        </button>
      </form>
    </div>
  )
}
