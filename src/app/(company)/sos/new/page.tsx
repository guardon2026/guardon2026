"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Zap, MapPin, Calendar, Clock, Users, Minus, Plus } from "lucide-react"
import { WorkField, CredentialType } from "@prisma/client"
import { SOS_FORM, WORK_FIELD_LABELS, CREDENTIAL_LABELS } from "@/lib/constants"

// ─────────────────────────────────────────
// 분야 멀티셀렉트 (pill 그리드)
// ─────────────────────────────────────────

function PillSelect<T extends string>({
  options,
  labels,
  value,
  onChange,
}: {
  options: T[]
  labels: Record<string, string>
  value: T[]
  onChange: (v: T[]) => void
}) {
  function toggle(opt: T) {
    onChange(value.includes(opt) ? value.filter((v) => v !== opt) : [...value, opt])
  }
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => toggle(opt)}
          className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
            value.includes(opt)
              ? "bg-brand text-white border-brand"
              : "bg-white text-gray-700 border-gray-200 hover:border-brand hover:text-brand"
          }`}
        >
          {labels[opt] ?? opt}
        </button>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────
// 숫자 스피너
// ─────────────────────────────────────────

function NumberSpinner({
  value,
  onChange,
  min = 1,
}: {
  value: number
  onChange: (v: number) => void
  min?: number
}) {
  return (
    <div className="flex items-center gap-0 border border-gray-200 rounded-xl overflow-hidden w-fit">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        className="w-10 h-10 flex items-center justify-center bg-gray-50 hover:bg-gray-100 transition-colors text-gray-600"
      >
        <Minus className="w-4 h-4" />
      </button>
      <span className="w-12 h-10 flex items-center justify-center text-sm font-semibold text-gray-900 border-x border-gray-200">
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        className="w-10 h-10 flex items-center justify-center bg-gray-50 hover:bg-gray-100 transition-colors text-gray-600"
      >
        <Plus className="w-4 h-4" />
      </button>
    </div>
  )
}

// ─────────────────────────────────────────
// 메인 페이지
// ─────────────────────────────────────────

export default function SosNewPage() {
  const router = useRouter()

  const [title, setTitle] = useState("")
  const [locationAddress, setLocationAddress] = useState("")
  const [latitude, setLatitude] = useState("")
  const [longitude, setLongitude] = useState("")
  const [scheduledDate, setScheduledDate] = useState("")
  const [scheduledTime, setScheduledTime] = useState("")
  const [requiredCount, setRequiredCount] = useState(1)
  const [requiredFields, setRequiredFields] = useState<WorkField[]>([])
  const [requiredCredentials, setRequiredCredentials] = useState<CredentialType[]>([])
  const [hourlyRate, setHourlyRate] = useState("")
  const [description, setDescription] = useState("")

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState("")

  const workFieldOptions = Object.values(WorkField)
  const credentialOptions = Object.values(CredentialType)

  function validate() {
    const newErrors: Record<string, string> = {}
    if (!title.trim()) newErrors.title = SOS_FORM.ERROR.TITLE_REQUIRED
    if (!locationAddress.trim()) newErrors.locationAddress = SOS_FORM.ERROR.ADDRESS_REQUIRED
    if (!scheduledDate || !scheduledTime) newErrors.scheduledAt = SOS_FORM.ERROR.SCHEDULED_AT_REQUIRED
    if (requiredCount < 1) newErrors.requiredCount = SOS_FORM.ERROR.REQUIRED_COUNT_INVALID
    if (requiredFields.length === 0) newErrors.requiredFields = SOS_FORM.ERROR.REQUIRED_FIELDS_REQUIRED
    if (!hourlyRate || Number(hourlyRate) < 0) newErrors.hourlyRate = SOS_FORM.ERROR.HOURLY_RATE_INVALID
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setSubmitting(true)
    setSubmitError("")
    try {
      const scheduledAt = new Date(`${scheduledDate}T${scheduledTime}:00`).toISOString()
      const body: Record<string, unknown> = {
        title: title.trim(),
        locationAddress: locationAddress.trim(),
        scheduledAt,
        requiredCount,
        requiredFields,
        requiredCredentials,
        hourlyRate: Number(hourlyRate),
        description: description.trim() || null,
      }
      if (latitude && longitude) {
        body.latitude = Number(latitude)
        body.longitude = Number(longitude)
      }
      const res = await fetch("/api/sos/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json()
        setSubmitError(data.error ?? SOS_FORM.ERROR.SUBMIT_FAILED)
        return
      }
      const data = await res.json()
      router.push(`/sos/${data.sosRequestId}`)
    } catch {
      setSubmitError(SOS_FORM.ERROR.SUBMIT_FAILED)
    } finally {
      setSubmitting(false)
    }
  }

  // 조건 요약 카드 데이터
  const summaryItems = [
    { label: "배치 일시", value: scheduledDate && scheduledTime ? `${scheduledDate} ${scheduledTime}` : "미입력" },
    { label: "장소", value: locationAddress || "미입력" },
    { label: "필요 인원", value: `${requiredCount}명` },
    {
      label: "분야",
      value: requiredFields.length > 0
        ? requiredFields.map((f) => WORK_FIELD_LABELS[f]).join(", ")
        : "미선택",
    },
    {
      label: "자격증",
      value: requiredCredentials.length > 0
        ? requiredCredentials.map((c) => CREDENTIAL_LABELS[c]).join(", ")
        : "없음",
    },
    { label: "시급", value: hourlyRate ? `${Number(hourlyRate).toLocaleString()}원/시간` : "미입력" },
  ]

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* SOS 배너 */}
        <div className="bg-sos text-white rounded-xl p-4 flex items-center gap-3">
          <Zap className="w-5 h-5 shrink-0" />
          <div>
            <p className="font-bold text-sm">긴급 인력 요청 — 8분 매칭 시작</p>
            <p className="text-xs text-red-200 mt-0.5">요청 발송 즉시 인근 인력에게 알림이 전송됩니다.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* 좌측: 요청 세부사항 (2/3) */}
            <div className="lg:col-span-2 space-y-6">

              {/* 요청 제목 */}
              <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6 space-y-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">요청 제목</p>
                <div>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={SOS_FORM.FIELDS.TITLE_PLACEHOLDER}
                    className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand transition-colors
                      ${errors.title ? "border-red-300 bg-red-50" : "border-gray-200"}`}
                  />
                  {errors.title && <p className="text-xs text-sos mt-1">{errors.title}</p>}
                </div>
              </div>

              {/* 날짜·시간 + 장소 */}
              <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6 space-y-5">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  일정 및 장소
                </p>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-gray-400" />
                      {SOS_FORM.FIELDS.SCHEDULED_DATE_LABEL}
                      <span className="text-sos">*</span>
                    </label>
                    <input
                      type="date"
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      className={`w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand
                        ${errors.scheduledAt ? "border-red-300 bg-red-50" : "border-gray-200"}`}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-gray-400" />
                      {SOS_FORM.FIELDS.SCHEDULED_TIME_LABEL}
                      <span className="text-sos">*</span>
                    </label>
                    <input
                      type="time"
                      value={scheduledTime}
                      onChange={(e) => setScheduledTime(e.target.value)}
                      className={`w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand
                        ${errors.scheduledAt ? "border-red-300 bg-red-50" : "border-gray-200"}`}
                    />
                  </div>
                </div>
                {errors.scheduledAt && <p className="text-xs text-sos">{errors.scheduledAt}</p>}

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-gray-400" />
                    {SOS_FORM.FIELDS.ADDRESS_LABEL}
                    <span className="text-sos">*</span>
                  </label>
                  <input
                    type="text"
                    value={locationAddress}
                    onChange={(e) => setLocationAddress(e.target.value)}
                    placeholder={SOS_FORM.FIELDS.ADDRESS_PLACEHOLDER}
                    className={`w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand
                      ${errors.locationAddress ? "border-red-300 bg-red-50" : "border-gray-200"}`}
                  />
                  {errors.locationAddress && <p className="text-xs text-sos mt-1">{errors.locationAddress}</p>}
                </div>

                {/* 위도·경도 (선택) */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-700">{SOS_FORM.FIELDS.LATITUDE_LABEL}</label>
                    <input
                      type="number"
                      step="any"
                      value={latitude}
                      onChange={(e) => setLatitude(e.target.value)}
                      placeholder={SOS_FORM.FIELDS.LATITUDE_PLACEHOLDER}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-700">{SOS_FORM.FIELDS.LONGITUDE_LABEL}</label>
                    <input
                      type="number"
                      step="any"
                      value={longitude}
                      onChange={(e) => setLongitude(e.target.value)}
                      placeholder={SOS_FORM.FIELDS.LONGITUDE_PLACEHOLDER}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                    />
                  </div>
                </div>
              </div>

              {/* 인원 + 분야 + 자격증 */}
              <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6 space-y-5">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" />
                  인력 조건
                </p>

                {/* 필요 인원 스피너 */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    {SOS_FORM.FIELDS.REQUIRED_COUNT_LABEL}
                    <span className="text-sos ml-0.5">*</span>
                  </label>
                  <div className="flex items-center gap-3">
                    <NumberSpinner value={requiredCount} onChange={setRequiredCount} min={1} />
                    <span className="text-sm text-gray-600">{SOS_FORM.FIELDS.REQUIRED_COUNT_UNIT}</span>
                  </div>
                  {errors.requiredCount && <p className="text-xs text-sos">{errors.requiredCount}</p>}
                </div>

                {/* 분야 선택 */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    {SOS_FORM.FIELDS.REQUIRED_FIELDS_LABEL}
                    <span className="text-sos ml-0.5">*</span>
                  </label>
                  <p className="text-xs text-gray-500">{SOS_FORM.FIELDS.REQUIRED_FIELDS_HINT}</p>
                  <PillSelect
                    options={workFieldOptions}
                    labels={WORK_FIELD_LABELS}
                    value={requiredFields}
                    onChange={setRequiredFields}
                  />
                  {errors.requiredFields && <p className="text-xs text-sos">{errors.requiredFields}</p>}
                </div>

                {/* 자격증 조건 */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    {SOS_FORM.FIELDS.REQUIRED_CREDENTIALS_LABEL}
                  </label>
                  <p className="text-xs text-gray-500">{SOS_FORM.FIELDS.REQUIRED_CREDENTIALS_HINT}</p>
                  <PillSelect
                    options={credentialOptions}
                    labels={CREDENTIAL_LABELS}
                    value={requiredCredentials}
                    onChange={setRequiredCredentials}
                  />
                </div>
              </div>

              {/* 시급 + 설명 */}
              <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6 space-y-5">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">급여 및 기타</p>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">
                    {SOS_FORM.FIELDS.HOURLY_RATE_LABEL}
                    <span className="text-sos ml-0.5">*</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      value={hourlyRate}
                      onChange={(e) => setHourlyRate(e.target.value)}
                      placeholder={SOS_FORM.FIELDS.HOURLY_RATE_PLACEHOLDER}
                      className={`w-40 border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand
                        ${errors.hourlyRate ? "border-red-300 bg-red-50" : "border-gray-200"}`}
                    />
                    <span className="text-sm text-gray-600">{SOS_FORM.FIELDS.HOURLY_RATE_UNIT}/시간</span>
                  </div>
                  {errors.hourlyRate && <p className="text-xs text-sos mt-1">{errors.hourlyRate}</p>}
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">{SOS_FORM.FIELDS.DESCRIPTION_LABEL}</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={SOS_FORM.FIELDS.DESCRIPTION_PLACEHOLDER}
                    rows={3}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand resize-none"
                  />
                </div>
              </div>

              {submitError && (
                <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-sos">
                  {submitError}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full h-14 flex items-center justify-center gap-2
                           bg-sos text-white font-bold text-base rounded-xl
                           hover:bg-red-700 transition-colors
                           disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <Zap className="w-5 h-5" />
                {submitting ? SOS_FORM.SUBMITTING : "SOS 긴급 요청 발송"}
              </button>
            </div>

            {/* 우측: 조건 요약 카드 (스티키) */}
            <div className="hidden lg:block">
              <div className="sticky top-20 bg-white rounded-2xl shadow-card border border-gray-100 p-6 space-y-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">요청 요약</p>
                <div className="space-y-3">
                  {summaryItems.map(({ label, value }) => (
                    <div key={label} className="flex flex-col gap-0.5">
                      <span className="text-xs text-gray-400">{label}</span>
                      <span className={`text-sm font-medium ${value === "미입력" || value === "미선택" ? "text-gray-300" : "text-gray-900"}`}>
                        {value}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="pt-3 border-t border-gray-100">
                  <p className="text-xs text-gray-400 leading-relaxed">
                    발송 후 인근 인력에게 즉시 알림이 전송됩니다.
                    평균 매칭 시간은 <span className="text-brand font-semibold">8분</span> 이내입니다.
                  </p>
                </div>
              </div>
            </div>

          </div>
        </form>
      </div>
    </div>
  )
}
