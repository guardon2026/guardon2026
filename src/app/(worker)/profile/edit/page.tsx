"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { PageHeader } from "@/components/ui/page-header"
import { WORKER_PROFILE, WORK_FIELD_LABELS, type WorkFieldKey } from "@/lib/constants"
import { cn } from "@/lib/utils"

const ALL_WORK_FIELDS = Object.keys(WORK_FIELD_LABELS) as WorkFieldKey[]

interface FormState {
  workFields: WorkFieldKey[]
  experienceYears: string
  address: string
  city: string
  district: string
  latitude: string
  longitude: string
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
  general?: string
}

export default function ProfileEditPage() {
  const router = useRouter()
  const [form, setForm] = useState<FormState>({
    workFields: [],
    experienceYears: "0",
    address: "",
    city: "",
    district: "",
    latitude: "",
    longitude: "",
    desiredHourlyRate: "",
    bio: "",
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await fetch("/api/worker/profile")
        if (res.ok) {
          const data = await res.json()
          if (data.profile) {
            const p = data.profile
            setForm({
              workFields: (p.workFields ?? []) as WorkFieldKey[],
              experienceYears: String(p.experienceYears ?? 0),
              address: p.address ?? "",
              city: p.city ?? "",
              district: p.district ?? "",
              latitude: p.latitude != null ? String(p.latitude) : "",
              longitude: p.longitude != null ? String(p.longitude) : "",
              desiredHourlyRate: p.desiredHourlyRate != null ? String(p.desiredHourlyRate) : "",
              bio: p.bio ?? "",
            })
          }
        }
      } catch {
        // 프로필 없으면 빈 폼 유지
      } finally {
        setIsLoading(false)
      }
    }
    loadProfile()
  }, [])

  function toggleWorkField(field: WorkFieldKey) {
    setForm((prev) => ({
      ...prev,
      workFields: prev.workFields.includes(field)
        ? prev.workFields.filter((f) => f !== field)
        : [...prev.workFields, field],
    }))
  }

  function validate(): FormErrors {
    const errs: FormErrors = {}
    if (form.workFields.length === 0) {
      errs.workFields = WORKER_PROFILE.ERROR.WORK_FIELDS_REQUIRED
    }
    if (!form.address.trim()) {
      errs.address = WORKER_PROFILE.ERROR.ADDRESS_REQUIRED
    }
    if (!form.city.trim()) {
      errs.city = WORKER_PROFILE.ERROR.CITY_REQUIRED
    }
    if (!form.district.trim()) {
      errs.district = WORKER_PROFILE.ERROR.DISTRICT_REQUIRED
    }
    const expNum = Number(form.experienceYears)
    if (isNaN(expNum) || expNum < 0 || !Number.isInteger(expNum)) {
      errs.experienceYears = WORKER_PROFILE.ERROR.EXPERIENCE_INVALID
    }
    if (form.desiredHourlyRate !== "") {
      const rateNum = Number(form.desiredHourlyRate)
      if (isNaN(rateNum) || rateNum < 0) {
        errs.desiredHourlyRate = WORKER_PROFILE.ERROR.HOURLY_RATE_INVALID
      }
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
      const body: Record<string, unknown> = {
        workFields: form.workFields,
        experienceYears: Number(form.experienceYears),
        address: form.address.trim(),
        city: form.city.trim(),
        district: form.district.trim(),
        bio: form.bio.trim() || null,
        desiredHourlyRate: form.desiredHourlyRate !== "" ? Number(form.desiredHourlyRate) : null,
      }
      if (form.latitude !== "" && form.longitude !== "") {
        body.latitude = Number(form.latitude)
        body.longitude = Number(form.longitude)
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
          if (!createRes.ok) {
            setErrors({ general: WORKER_PROFILE.ERROR.SAVE_FAILED })
            return
          }
        } else {
          const data = await res.json().catch(() => ({}))
          setErrors({ general: data.error ?? WORKER_PROFILE.ERROR.SAVE_FAILED })
          return
        }
      }

      // 성공 toast
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

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <p className="text-sm text-gray-500">불러오는 중...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-10">
      {/* 성공 toast */}
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
            disabled={isSubmitting}
            onClick={() => {
              const form = document.getElementById("profile-edit-form") as HTMLFormElement
              form?.requestSubmit()
            }}
            className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-semibold bg-brand text-white hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {isSubmitting ? WORKER_PROFILE.SUBMITTING : WORKER_PROFILE.SUBMIT_BUTTON}
          </button>
        }
      />

      <form id="profile-edit-form" onSubmit={handleSubmit} className="space-y-6" noValidate>
        {/* 섹션 1: 기본 정보 */}
        <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">기본 정보</h2>

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
            {errors.experienceYears && (
              <p className="text-xs text-sos">{errors.experienceYears}</p>
            )}
          </div>
        </div>

        {/* 섹션 2: 전문 분야 */}
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
          {errors.workFields && (
            <p className="text-xs text-sos">{errors.workFields}</p>
          )}
        </div>

        {/* 섹션 3: 위치 정보 */}
        <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">위치 정보</h2>

          <div className="space-y-1.5">
            <Label htmlFor="address">{WORKER_PROFILE.FIELDS.ADDRESS_LABEL}</Label>
            <Input
              id="address"
              type="text"
              value={form.address}
              onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
              placeholder={WORKER_PROFILE.FIELDS.ADDRESS_PLACEHOLDER}
            />
            {errors.address && (
              <p className="text-xs text-sos">{errors.address}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="city">{WORKER_PROFILE.FIELDS.CITY_LABEL}</Label>
              <Input
                id="city"
                type="text"
                value={form.city}
                onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}
                placeholder={WORKER_PROFILE.FIELDS.CITY_PLACEHOLDER}
              />
              {errors.city && (
                <p className="text-xs text-sos">{errors.city}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="district">{WORKER_PROFILE.FIELDS.DISTRICT_LABEL}</Label>
              <Input
                id="district"
                type="text"
                value={form.district}
                onChange={(e) => setForm((p) => ({ ...p, district: e.target.value }))}
                placeholder={WORKER_PROFILE.FIELDS.DISTRICT_PLACEHOLDER}
              />
              {errors.district && (
                <p className="text-xs text-sos">{errors.district}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="latitude">{WORKER_PROFILE.FIELDS.LATITUDE_LABEL}</Label>
              <Input
                id="latitude"
                type="number"
                step="any"
                value={form.latitude}
                onChange={(e) => setForm((p) => ({ ...p, latitude: e.target.value }))}
                placeholder={WORKER_PROFILE.FIELDS.LATITUDE_PLACEHOLDER}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="longitude">{WORKER_PROFILE.FIELDS.LONGITUDE_LABEL}</Label>
              <Input
                id="longitude"
                type="number"
                step="any"
                value={form.longitude}
                onChange={(e) => setForm((p) => ({ ...p, longitude: e.target.value }))}
                placeholder={WORKER_PROFILE.FIELDS.LONGITUDE_PLACEHOLDER}
              />
            </div>
          </div>

          {/* 희망 시급 */}
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
            {errors.desiredHourlyRate && (
              <p className="text-xs text-sos">{errors.desiredHourlyRate}</p>
            )}
          </div>
        </div>

        {/* 섹션 4: 소개 */}
        <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6 space-y-3">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">소개</h2>
          <div className="space-y-1.5">
            <Label htmlFor="bio">{WORKER_PROFILE.FIELDS.BIO_LABEL}</Label>
            <div className="relative">
              <Textarea
                id="bio"
                value={form.bio}
                onChange={(e) => {
                  if (e.target.value.length <= 500) {
                    setForm((p) => ({ ...p, bio: e.target.value }))
                  }
                }}
                placeholder={WORKER_PROFILE.FIELDS.BIO_PLACEHOLDER}
                rows={5}
                maxLength={500}
              />
              <span className="absolute bottom-2 right-3 text-xs text-gray-400 select-none">
                {form.bio.length}/500
              </span>
            </div>
          </div>
        </div>

        {errors.general && (
          <p className="text-sm text-sos text-center">{errors.general}</p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3 rounded-xl text-sm font-semibold bg-brand text-white hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {isSubmitting ? WORKER_PROFILE.SUBMITTING : WORKER_PROFILE.SUBMIT_BUTTON}
        </button>
      </form>
    </div>
  )
}
