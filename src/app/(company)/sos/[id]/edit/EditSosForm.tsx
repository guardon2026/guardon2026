"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Zap, MapPin, Calendar, Users, Minus, Plus, Search, Trash2 } from "lucide-react"
import { WorkField, CredentialType } from "@prisma/client"
import { SOS_FORM, WORK_FIELD_LABELS, CREDENTIAL_LABELS } from "@/lib/constants"

// ─────────────────────────────────────────
// 타입
// ─────────────────────────────────────────

interface WorkDay {
  id: number
  date: string
  startTime: string
  endDate: string
  endTime: string
}

export interface SosInitialData {
  id: string
  title: string
  locationAddress: string
  scheduleDays: { date: string; startTime: string; endDate?: string; endTime: string }[] | null
  scheduledAt: string
  scheduledEndAt: string | null
  requiredCount: number
  requiredFields: string[]
  requiredCredentials: string[]
  hourlyRate: number
  description: string | null
}

// ─────────────────────────────────────────
// 헬퍼
// ─────────────────────────────────────────

const WEEK_DAYS = ["일", "월", "화", "수", "목", "금", "토"]

function formatDateShort(dateStr: string) {
  if (!dateStr) return ""
  const d = new Date(dateStr + "T00:00:00")
  return `${d.getMonth() + 1}/${d.getDate()}(${WEEK_DAYS[d.getDay()]})`
}

function formatTimeKorean(timeStr: string) {
  if (!timeStr) return ""
  const [h, m] = timeStr.split(":").map(Number)
  const period = h < 12 ? "오전" : "오후"
  const hour = h > 12 ? h - 12 : h === 0 ? 0 : h
  return `${period} ${hour}:${String(m).padStart(2, "0")}`
}

const TIME_OPTIONS: { value: string; label: string }[] = (() => {
  const opts = []
  for (let h = 0; h < 24; h++) {
    for (const m of [0, 30]) {
      const hh = String(h).padStart(2, "0")
      const mm = String(m).padStart(2, "0")
      const value = `${hh}:${mm}`
      const period = h < 12 ? "오전" : "오후"
      const displayH = h > 12 ? h - 12 : h
      opts.push({ value, label: `${period} ${displayH}:${mm}` })
    }
  }
  return opts
})()

// ─────────────────────────────────────────
// 서브 컴포넌트
// ─────────────────────────────────────────

function TimeSelect({
  value,
  onChange,
  placeholder = "시간 선택",
  hasError,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  hasError?: boolean
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`border rounded-lg px-2 py-1.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-brand bg-white appearance-none cursor-pointer
        ${hasError ? "border-red-300 bg-red-50" : "border-gray-200"}`}
    >
      <option value="" disabled>{placeholder}</option>
      {TIME_OPTIONS.map(({ value: v, label }) => (
        <option key={v} value={v}>{label}</option>
      ))}
    </select>
  )
}

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

function NumberSpinner({ value, onChange, min = 1 }: { value: number; onChange: (v: number) => void; min?: number }) {
  return (
    <div className="flex items-center gap-0 border border-gray-200 rounded-xl overflow-hidden w-fit">
      <button type="button" onClick={() => onChange(Math.max(min, value - 1))}
        className="w-10 h-10 flex items-center justify-center bg-gray-50 hover:bg-gray-100 transition-colors text-gray-600">
        <Minus className="w-4 h-4" />
      </button>
      <span className="w-12 h-10 flex items-center justify-center text-sm font-semibold text-gray-900 border-x border-gray-200">
        {value}
      </span>
      <button type="button" onClick={() => onChange(value + 1)}
        className="w-10 h-10 flex items-center justify-center bg-gray-50 hover:bg-gray-100 transition-colors text-gray-600">
        <Plus className="w-4 h-4" />
      </button>
    </div>
  )
}

// ─────────────────────────────────────────
// 메인 폼
// ─────────────────────────────────────────

export default function EditSosForm({ initial }: { initial: SosInitialData }) {
  const router = useRouter()

  // scheduleDays → WorkDay[] 변환 (초기값)
  const initialDays: WorkDay[] = (() => {
    if (initial.scheduleDays && initial.scheduleDays.length > 0) {
      return initial.scheduleDays.map((d, i) => ({
        id: i + 1,
        date: d.date,
        startTime: d.startTime,
        endDate: d.endDate ?? d.date,
        endTime: d.endTime,
      }))
    }
    // scheduleDays 없을 때 scheduledAt에서 생성
    const at = new Date(initial.scheduledAt)
    const dateStr = at.toISOString().slice(0, 10)
    const hh = String(at.getHours()).padStart(2, "0")
    const mm = String(Math.round(at.getMinutes() / 30) * 30).padStart(2, "0")
    return [{ id: 1, date: dateStr, startTime: `${hh}:${mm}`, endDate: dateStr, endTime: "" }]
  })()

  const [title, setTitle] = useState(initial.title)
  const [locationAddress, setLocationAddress] = useState(initial.locationAddress)
  const [locationDetail, setLocationDetail] = useState("")
  const [workDays, setWorkDays] = useState<WorkDay[]>(initialDays)
  const [requiredCount, setRequiredCount] = useState(initial.requiredCount)
  const [requiredFields, setRequiredFields] = useState<WorkField[]>(initial.requiredFields as WorkField[])
  const [requiredCredentials, setRequiredCredentials] = useState<CredentialType[]>(initial.requiredCredentials as CredentialType[])
  const [hourlyRate, setHourlyRate] = useState(String(initial.hourlyRate))
  const [description, setDescription] = useState(initial.description ?? "")

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState("")
  const [successModal, setSuccessModal] = useState<{ notifiedCount: number } | null>(null)

  const [addrModalOpen, setAddrModalOpen] = useState(false)
  const [daumLoading, setDaumLoading] = useState(false)
  const addrEmbedRef = useRef<HTMLDivElement>(null)
  const startDateRefsMap = useRef<Map<number, HTMLInputElement>>(new Map())
  const endDateRefsMap = useRef<Map<number, HTMLInputElement>>(new Map())

  const workFieldOptions = Object.values(WorkField)
  const credentialOptions = Object.values(CredentialType)

  useEffect(() => {
    if (!addrModalOpen) return
    const w = window as any
    const doEmbed = () => {
      setDaumLoading(false)
      if (!addrEmbedRef.current) return
      addrEmbedRef.current.innerHTML = ""
      new w.daum.Postcode({
        oncomplete(data: { roadAddress: string; jibunAddress: string }) {
          setLocationAddress(data.roadAddress || data.jibunAddress)
          setLocationDetail("")
          setErrors((prev) => ({ ...prev, locationAddress: "" }))
          setAddrModalOpen(false)
        },
        width: "100%",
        height: "100%",
      }).embed(addrEmbedRef.current, { autoClose: false })
    }
    if (w.daum?.Postcode) { doEmbed(); return }
    setDaumLoading(true)
    if (!document.querySelector('script[src*="daumcdn.net"]')) {
      const script = document.createElement("script")
      script.src = "https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js"
      script.async = true
      script.onload = doEmbed
      script.onerror = () => { setDaumLoading(false); setAddrModalOpen(false) }
      document.head.appendChild(script)
    } else {
      const existing = document.querySelector('script[src*="daumcdn.net"]') as HTMLScriptElement
      existing.addEventListener("load", doEmbed, { once: true })
    }
  }, [addrModalOpen])

  function addDay() { setWorkDays((prev) => [...prev, { id: Date.now(), date: "", startTime: "", endDate: "", endTime: "" }]) }
  function removeDay(id: number) {
    setWorkDays((prev) => (prev.length > 1 ? prev.filter((d) => d.id !== id) : prev))
    startDateRefsMap.current.delete(id)
    endDateRefsMap.current.delete(id)
  }
  function updateDay(id: number, field: keyof Omit<WorkDay, "id">, value: string) {
    setWorkDays((prev) => prev.map((d) => {
      if (d.id !== id) return d
      const updated = { ...d, [field]: value }
      if (field === "date" && !d.endDate) updated.endDate = value
      return updated
    }))
  }
  function getWorkDaysWithDates(): WorkDay[] {
    return workDays.map((d) => ({
      ...d,
      date: startDateRefsMap.current.get(d.id)?.value || d.date,
      endDate: endDateRefsMap.current.get(d.id)?.value || d.endDate || d.date,
    }))
  }

  function validate() {
    const newErrors: Record<string, string> = {}
    if (!title.trim()) newErrors.title = SOS_FORM.ERROR.TITLE_REQUIRED
    if (!locationAddress.trim()) newErrors.locationAddress = SOS_FORM.ERROR.ADDRESS_REQUIRED
    const days = getWorkDaysWithDates()
    if (days.some((d) => !d.date || !d.endDate)) newErrors.workDays = "모든 근무일의 날짜를 입력해 주세요."
    else if (days.some((d) => !d.startTime || !d.endTime)) newErrors.workDays = "모든 근무일의 시작·종료 시간을 입력해 주세요."
    else if (days.some((d) => d.date && d.endDate && d.startTime && d.endTime && new Date(`${d.endDate}T${d.endTime}`) <= new Date(`${d.date}T${d.startTime}`)))
      newErrors.workDays = "종료 일시는 시작 일시보다 이후여야 합니다."
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
      const days = getWorkDaysWithDates().sort((a, b) => a.date.localeCompare(b.date))
      const first = days[0]
      const last = days[days.length - 1]
      const fullAddress = locationDetail.trim()
        ? `${locationAddress.trim()} ${locationDetail.trim()}`
        : locationAddress.trim()

      const res = await fetch(`/api/sos/requests/${initial.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          locationAddress: fullAddress,
          scheduledAt: new Date(`${first.date}T${first.startTime}:00`).toISOString(),
          scheduledEndAt: new Date(`${last.endDate || last.date}T${last.endTime}:00`).toISOString(),
          scheduleDays: days.map((d) => ({
            date: d.date,
            startTime: d.startTime,
            endDate: d.endDate || d.date,
            endTime: d.endTime,
          })),
          requiredCount,
          requiredFields,
          requiredCredentials,
          hourlyRate: Number(hourlyRate),
          description: description.trim() || null,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        setSubmitError(data.error ?? "수정 중 오류가 발생했습니다.")
        return
      }
      const data = await res.json()
      setSuccessModal({ notifiedCount: data.notifiedCount ?? 0 })
    } catch {
      setSubmitError("수정 중 오류가 발생했습니다. 다시 시도해 주세요.")
    } finally {
      setSubmitting(false)
    }
  }

  // 요약
  const daysWithDates = workDays.filter((d) => d.date)
  const summaryItems = [
    {
      label: "배치 일정",
      value: daysWithDates.length === 0 ? "미입력"
        : daysWithDates.length === 1 ? `${daysWithDates[0].date}${daysWithDates[0].startTime ? ` ${daysWithDates[0].startTime}~${daysWithDates[0].endTime}` : ""}`
        : `${daysWithDates[0].date} ~ ${daysWithDates[daysWithDates.length - 1].date} (${daysWithDates.length}일)`,
    },
    { label: "장소", value: locationAddress ? `${locationAddress}${locationDetail ? " " + locationDetail : ""}` : "미입력" },
    { label: "필요 인원", value: `${requiredCount}명` },
    { label: "분야", value: requiredFields.length > 0 ? requiredFields.map((f) => WORK_FIELD_LABELS[f]).join(", ") : "미선택" },
    { label: "자격증", value: requiredCredentials.length > 0 ? requiredCredentials.map((c) => CREDENTIAL_LABELS[c]).join(", ") : "없음" },
    { label: "일급", value: hourlyRate ? `${Number(hourlyRate).toLocaleString()}원/일` : "미입력" },
  ]

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* 수정 안내 배너 */}
        <div className="bg-amber-500 text-white rounded-xl p-4 flex items-center gap-3">
          <Zap className="w-5 h-5 shrink-0" />
          <div>
            <p className="font-bold text-sm">SOS 요청 수정</p>
            <p className="text-xs text-amber-100 mt-0.5">수정 내용은 이미 알림을 받은 인력에게 즉시 안내됩니다.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">

              {/* 요청 제목 */}
              <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6 space-y-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">요청 제목 <span className="text-sos">*</span></p>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={SOS_FORM.FIELDS.TITLE_PLACEHOLDER}
                  className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand
                    ${errors.title ? "border-red-300 bg-red-50" : "border-gray-200"}`}
                />
                {errors.title && <p className="text-xs text-sos mt-1">{errors.title}</p>}
              </div>

              {/* 배치 일정 */}
              <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />배치 일정
                  </p>
                  <button type="button" onClick={addDay}
                    className="flex items-center gap-1 text-xs text-brand font-medium hover:underline">
                    <Plus className="w-3.5 h-3.5" />날짜 추가
                  </button>
                </div>

                <div className="rounded-xl border border-gray-200 overflow-hidden">
                  <div className="grid grid-cols-[1fr_90px_1fr_90px_36px] bg-gray-50 px-3 py-2.5 text-xs font-semibold text-gray-500 border-b border-gray-200 gap-2">
                    <span>시작 날짜 <span className="text-sos">*</span></span>
                    <span>시작 시간 <span className="text-sos">*</span></span>
                    <span>종료 날짜 <span className="text-sos">*</span></span>
                    <span>종료 시간 <span className="text-sos">*</span></span>
                    <span />
                  </div>
                  {workDays.map((day, idx) => {
                    const hasTimeError = !!(day.date && day.endDate && day.startTime && day.endTime &&
                      new Date(`${day.endDate}T${day.endTime}`) <= new Date(`${day.date}T${day.startTime}`))
                    return (
                      <div key={day.id}
                        className={`grid grid-cols-[1fr_90px_1fr_90px_36px] items-center px-3 py-2.5 gap-2
                          ${idx % 2 === 0 ? "bg-white" : "bg-gray-50/50"}
                          ${idx < workDays.length - 1 ? "border-b border-gray-100" : ""}`}
                      >
                        <input type="date"
                          ref={(el) => { if (el) startDateRefsMap.current.set(day.id, el) }}
                          defaultValue={day.date}
                          onChange={(e) => updateDay(day.id, "date", e.target.value)}
                          className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-brand"
                        />
                        <TimeSelect value={day.startTime} onChange={(v) => updateDay(day.id, "startTime", v)} placeholder="시작" hasError={hasTimeError} />
                        <input type="date"
                          ref={(el) => { if (el) endDateRefsMap.current.set(day.id, el) }}
                          defaultValue={day.endDate}
                          min={day.date || undefined}
                          onChange={(e) => updateDay(day.id, "endDate", e.target.value)}
                          className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-brand"
                        />
                        <TimeSelect value={day.endTime}
                          onChange={(v) => {
                            if (day.date && day.endDate === day.date && day.startTime && v <= day.startTime) {
                              const next = new Date(day.date)
                              next.setDate(next.getDate() + 1)
                              setWorkDays((prev) => prev.map((d) =>
                                d.id === day.id ? { ...d, endTime: v, endDate: next.toISOString().slice(0, 10) } : d
                              ))
                            } else {
                              updateDay(day.id, "endTime", v)
                            }
                          }}
                          placeholder="종료" hasError={hasTimeError}
                        />
                        <button type="button" onClick={() => removeDay(day.id)} disabled={workDays.length === 1}
                          className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:text-sos hover:bg-red-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )
                  })}
                </div>
                {errors.workDays && <p className="text-xs text-sos">{errors.workDays}</p>}
              </div>

              {/* 집결지 주소 */}
              <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6 space-y-3">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" />집결지 주소
                </p>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">{SOS_FORM.FIELDS.ADDRESS_LABEL}<span className="text-sos ml-0.5">*</span></label>
                  <div className="flex gap-2">
                    <input type="text" readOnly value={locationAddress}
                      placeholder="주소 검색 버튼을 눌러 주소를 선택해 주세요."
                      className={`flex-1 border rounded-xl px-4 py-2.5 text-sm bg-gray-50 cursor-default
                        ${errors.locationAddress ? "border-red-300 bg-red-50" : "border-gray-200"}`}
                    />
                    <button type="button" onClick={() => setAddrModalOpen(true)}
                      className="flex items-center gap-1.5 px-4 py-2.5 bg-brand text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors shrink-0">
                      <Search className="w-4 h-4" />주소 검색
                    </button>
                  </div>
                  {errors.locationAddress && <p className="text-xs text-sos mt-1">{errors.locationAddress}</p>}
                  <input type="text" value={locationDetail} onChange={(e) => setLocationDetail(e.target.value)}
                    placeholder="상세 주소 입력 (동·호수, 층 등)"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                  />
                </div>
              </div>

              {/* 인력 조건 */}
              <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6 space-y-5">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" />인력 조건
                </p>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">{SOS_FORM.FIELDS.REQUIRED_COUNT_LABEL}<span className="text-sos ml-0.5">*</span></label>
                  <div className="flex items-center gap-3">
                    <NumberSpinner value={requiredCount} onChange={setRequiredCount} min={1} />
                    <span className="text-sm text-gray-600">{SOS_FORM.FIELDS.REQUIRED_COUNT_UNIT}</span>
                  </div>
                  {errors.requiredCount && <p className="text-xs text-sos">{errors.requiredCount}</p>}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">{SOS_FORM.FIELDS.REQUIRED_FIELDS_LABEL}<span className="text-sos ml-0.5">*</span></label>
                  <p className="text-xs text-gray-500">{SOS_FORM.FIELDS.REQUIRED_FIELDS_HINT}</p>
                  <PillSelect options={workFieldOptions} labels={WORK_FIELD_LABELS} value={requiredFields} onChange={setRequiredFields} />
                  {errors.requiredFields && <p className="text-xs text-sos">{errors.requiredFields}</p>}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">{SOS_FORM.FIELDS.REQUIRED_CREDENTIALS_LABEL}</label>
                  <p className="text-xs text-gray-500">{SOS_FORM.FIELDS.REQUIRED_CREDENTIALS_HINT}</p>
                  <PillSelect options={credentialOptions} labels={CREDENTIAL_LABELS} value={requiredCredentials} onChange={setRequiredCredentials} />
                </div>
              </div>

              {/* 급여 및 기타 */}
              <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6 space-y-5">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">급여 및 기타</p>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">{SOS_FORM.FIELDS.HOURLY_RATE_LABEL}<span className="text-sos ml-0.5">*</span></label>
                  <div className="flex items-center gap-2">
                    <input type="number" min="0" value={hourlyRate} onChange={(e) => setHourlyRate(e.target.value)}
                      placeholder={SOS_FORM.FIELDS.HOURLY_RATE_PLACEHOLDER}
                      className={`w-40 border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand
                        ${errors.hourlyRate ? "border-red-300 bg-red-50" : "border-gray-200"}`}
                    />
                    <span className="text-sm text-gray-600">{SOS_FORM.FIELDS.HOURLY_RATE_UNIT}/일</span>
                  </div>
                  {errors.hourlyRate && <p className="text-xs text-sos mt-1">{errors.hourlyRate}</p>}
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">{SOS_FORM.FIELDS.DESCRIPTION_LABEL}</label>
                  <textarea value={description} onChange={(e) => setDescription(e.target.value)}
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

              <div className="flex gap-3">
                <button type="button" onClick={() => router.back()}
                  className="flex-1 h-14 rounded-xl border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors">
                  취소
                </button>
                <button type="submit" disabled={submitting}
                  className="flex-1 h-14 flex items-center justify-center gap-2 bg-brand text-white font-bold text-base rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed">
                  <Zap className="w-5 h-5" />
                  {submitting ? "수정 중..." : "수정 완료"}
                </button>
              </div>
            </div>

            {/* 우측 요약 카드 */}
            <div className="hidden lg:block">
              <div className="sticky top-20 bg-white rounded-2xl shadow-card border border-gray-100 p-6 space-y-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">수정 요약</p>
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
                  <p className="text-xs text-amber-600 leading-relaxed">
                    수정 후 이미 알림을 받은 인력에게 <span className="font-semibold">변경 안내 알림</span>이 전송됩니다.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </form>

        {/* 수정 완료 팝업 */}
        {successModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 overflow-hidden">
              <div className="px-6 pt-6 pb-5 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 00-1.414 0L8 12.586 4.707 9.293a1 1 0 00-1.414 1.414l4 4a1 1 0 001.414 0l8-8a1 1 0 000-1.414z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 text-base">수정이 완료되었습니다</p>
                    <p className="text-xs text-gray-500 mt-0.5">SOS 요청 내용이 성공적으로 저장되었습니다.</p>
                  </div>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                  <p className="text-sm text-amber-800 leading-relaxed">
                    {successModal.notifiedCount > 0 ? (
                      <>
                        지원하거나 확정된 경비 인력{" "}
                        <span className="font-bold">{successModal.notifiedCount}명</span>에게
                        변경 내용 알림을 발송했습니다.
                      </>
                    ) : (
                      "현재 지원하거나 확정된 경비 인력이 없어 알림이 발송되지 않았습니다."
                    )}
                  </p>
                </div>
              </div>
              <div className="px-6 pb-6">
                <button
                  type="button"
                  onClick={() => {
                    setSuccessModal(null)
                    router.push(`/sos/${initial.id}`)
                    router.refresh()
                  }}
                  className="w-full h-11 bg-brand text-white font-semibold text-sm rounded-xl hover:bg-blue-700 transition-colors"
                >
                  확인
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 주소 검색 모달 */}
        {addrModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            onClick={(e) => { if (e.target === e.currentTarget) setAddrModalOpen(false) }}>
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <span className="font-semibold text-gray-900">주소 검색</span>
                <button type="button" onClick={() => setAddrModalOpen(false)}
                  className="text-gray-400 hover:text-gray-700 text-xl leading-none">✕</button>
              </div>
              <div className="relative" style={{ height: 460 }}>
                {daumLoading && (
                  <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-400">
                    주소 검색 서비스를 불러오는 중입니다...
                  </div>
                )}
                <div ref={addrEmbedRef} style={{ width: "100%", height: "100%" }} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
