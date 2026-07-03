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
  date: string       // 시작 날짜
  startTime: string
  endDate: string    // 종료 날짜 (다음 날이면 date+1)
  endTime: string
}

// ─────────────────────────────────────────
// 유틸
// ─────────────────────────────────────────

// 초기 행은 고정 ID — SSR·클라이언트 hydration 일치를 위해 Math.random/Date.now 사용 금지
const INITIAL_DAY: WorkDay = { id: 1, date: "", startTime: "", endDate: "", endTime: "" }

// 추가 행은 클라이언트 클릭 시에만 호출되므로 Date.now() 사용 가능
function makeDay(): WorkDay {
  return { id: Date.now(), date: "", startTime: "", endDate: "", endTime: "" }
}

// 30분 단위 시간 옵션 생성 (오전 00:00~11:30, 오후 12:00~23:30)
const TIME_OPTIONS: { value: string; label: string }[] = (() => {
  const opts = []
  for (let h = 0; h < 24; h++) {
    for (const m of [0, 30]) {
      const hh = String(h).padStart(2, "0")
      const mm = String(m).padStart(2, "0")
      const value = `${hh}:${mm}`
      const period = h < 12 ? "오전" : "오후"
      const displayH = h > 12 ? h - 12 : h
      const label = `${period} ${displayH}:${mm}`
      opts.push({ value, label })
    }
  }
  return opts
})()

// ─────────────────────────────────────────
// 시간 선택 셀렉트
// ─────────────────────────────────────────

function TimeSelect({
  value,
  onChange,
  placeholder = "시간 선택",
  hasError,
  minTime,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  hasError?: boolean
  minTime?: string  // "HH:mm" — 이 시각 이후만 선택 가능 (같은 날 종료 시간용)
}) {
  const options = minTime
    ? TIME_OPTIONS.filter(({ value: v }) => v > minTime)
    : TIME_OPTIONS

  // 현재 선택된 값이 필터 밖이면 자동 초기화
  if (value && minTime && value <= minTime) {
    onChange("")
  }

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`border rounded-lg px-2 py-1.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-brand bg-white appearance-none cursor-pointer
        ${hasError ? "border-red-300 bg-red-50" : "border-gray-200"}`}
    >
      <option value="" disabled>{placeholder}</option>
      {options.map(({ value: v, label }) => (
        <option key={v} value={v}>{label}</option>
      ))}
    </select>
  )
}

// ─────────────────────────────────────────
// 분야 멀티셀렉트
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
  const [locationDetail, setLocationDetail] = useState("")

  // 근무일 목록 — 초기값은 고정 ID (hydration 일치)
  const [workDays, setWorkDays] = useState<WorkDay[]>([INITIAL_DAY])
  // 날짜 입력 ref 배열 (submit 시 직접 읽기 — onChange 미발생 대비)
  const startDateRefsMap = useRef<Map<number, HTMLInputElement>>(new Map())
  const endDateRefsMap = useRef<Map<number, HTMLInputElement>>(new Map())

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

  const [addrModalOpen, setAddrModalOpen] = useState(false)
  const [daumLoading, setDaumLoading] = useState(false)
  const addrEmbedRef = useRef<HTMLDivElement>(null)

  // 주소 검색 모달이 열릴 때 Daum 위젯 임베드
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
          setErrors((prev) => ({ ...prev, locationAddress: "" }))
          setAddrModalOpen(false)
        },
        width: "100%",
        height: "100%",
      }).embed(addrEmbedRef.current, { autoClose: false })
    }

    if (w.daum?.Postcode) {
      doEmbed()
      return
    }

    setDaumLoading(true)
    if (!document.querySelector('script[src*="daumcdn.net"]')) {
      const script = document.createElement("script")
      script.src = "https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js"
      script.async = true
      script.onload = doEmbed
      script.onerror = () => {
        setDaumLoading(false)
        setAddrModalOpen(false)
        alert("주소 검색 서비스를 불러오지 못했습니다. 네트워크 연결을 확인해 주세요.")
      }
      document.head.appendChild(script)
    } else {
      const existing = document.querySelector('script[src*="daumcdn.net"]') as HTMLScriptElement
      existing.addEventListener("load", doEmbed, { once: true })
    }
  }, [addrModalOpen])

  // 근무일 조작
  function addDay() {
    setWorkDays((prev) => [...prev, makeDay()])
  }

  function removeDay(id: number) {
    setWorkDays((prev) => (prev.length > 1 ? prev.filter((d) => d.id !== id) : prev))
    startDateRefsMap.current.delete(id)
    endDateRefsMap.current.delete(id)
  }

  function updateDay(id: number, field: keyof Omit<WorkDay, "id">, value: string) {
    setWorkDays((prev) =>
      prev.map((d) => {
        if (d.id !== id) return d
        const updated = { ...d, [field]: value }
        // 시작 날짜 변경 시 종료 날짜가 비어있으면 자동 동기화
        if (field === "date" && !d.endDate) updated.endDate = value
        return updated
      })
    )
  }

  function openAddressSearch() {
    setAddrModalOpen(true)
  }

  // submit 시 ref에서 날짜값 읽기 (onChange 미발생 대비)
  function getWorkDaysWithDates(): WorkDay[] {
    return workDays.map((d) => {
      const date = startDateRefsMap.current.get(d.id)?.value || d.date
      const endDate = endDateRefsMap.current.get(d.id)?.value || d.endDate || date
      return { ...d, date, endDate }
    })
  }

  function validate() {
    const newErrors: Record<string, string> = {}
    if (!title.trim()) newErrors.title = SOS_FORM.ERROR.TITLE_REQUIRED
    if (!locationAddress.trim()) newErrors.locationAddress = SOS_FORM.ERROR.ADDRESS_REQUIRED

    const days = getWorkDaysWithDates()
    const hasEmptyDate = days.some((d) => !d.date || !d.endDate)
    const hasEmptyTime = days.some((d) => !d.startTime || !d.endTime)
    // 시작 datetime이 종료 datetime 이후이면 에러
    const hasInvalidTime = days.some((d) => {
      if (!d.date || !d.endDate || !d.startTime || !d.endTime) return false
      return new Date(`${d.endDate}T${d.endTime}`) <= new Date(`${d.date}T${d.startTime}`)
    })

    if (hasEmptyDate) newErrors.workDays = "모든 근무일의 날짜를 입력해 주세요."
    else if (hasEmptyTime) newErrors.workDays = "모든 근무일의 시작·종료 시간을 입력해 주세요."
    else if (hasInvalidTime) newErrors.workDays = "종료 일시는 시작 일시보다 이후여야 합니다."

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

      const res = await fetch("/api/sos/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          locationAddress: locationDetail.trim()
            ? `${locationAddress.trim()} ${locationDetail.trim()}`
            : locationAddress.trim(),
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

  // 요약 표시
  const daysWithDates = workDays.filter((d) => d.date)
  const scheduleSummary =
    daysWithDates.length === 0
      ? "미입력"
      : daysWithDates.length === 1
      ? `${daysWithDates[0].date}${daysWithDates[0].startTime ? ` ${daysWithDates[0].startTime}~${daysWithDates[0].endTime}` : ""}`
      : `${daysWithDates[0].date} ~ ${daysWithDates[daysWithDates.length - 1].date} (${daysWithDates.length}일)`

  const summaryItems = [
    { label: "배치 일정", value: scheduleSummary },
    { label: "장소", value: locationAddress ? `${locationAddress}${locationDetail ? " " + locationDetail : ""}` : "미입력" },
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
    {
      label: "일급",
      value: hourlyRate ? `${Number(hourlyRate).toLocaleString()}원/일` : "미입력",
    },
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
            <div className="lg:col-span-2 space-y-6">

              {/* 요청 제목 */}
              <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6 space-y-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">요청 제목 <span className="text-sos">*</span></p>
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

              {/* 배치 일정 */}
              <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    배치 일정
                  </p>
                  <button
                    type="button"
                    onClick={addDay}
                    className="flex items-center gap-1 text-xs text-brand font-medium hover:underline"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    날짜 추가
                  </button>
                </div>

                {/* 근무일 테이블 */}
                <div className="rounded-xl border border-gray-200 overflow-hidden">
                  {/* 헤더 */}
                  <div className="grid grid-cols-[1fr_90px_1fr_90px_36px] bg-gray-50 px-3 py-2.5 text-xs font-semibold text-gray-500 border-b border-gray-200 gap-2">
                    <span>시작 날짜 <span className="text-sos">*</span></span>
                    <span>시작 시간 <span className="text-sos">*</span></span>
                    <span>종료 날짜 <span className="text-sos">*</span></span>
                    <span>종료 시간 <span className="text-sos">*</span></span>
                    <span />
                  </div>

                  {/* 행 */}
                  {workDays.map((day, idx) => {
                    const hasTimeError = !!(
                      day.date && day.endDate && day.startTime && day.endTime &&
                      new Date(`${day.endDate}T${day.endTime}`) <= new Date(`${day.date}T${day.startTime}`)
                    )
                    const endIsNextDay = day.date && day.endDate && day.endDate > day.date
                    return (
                      <div
                        key={day.id}
                        className={`grid grid-cols-[1fr_90px_1fr_90px_36px] items-center px-3 py-2.5 gap-2
                          ${idx % 2 === 0 ? "bg-white" : "bg-gray-50/50"}
                          ${idx < workDays.length - 1 ? "border-b border-gray-100" : ""}
                        `}
                      >
                        {/* 시작 날짜 */}
                        <input
                          type="date"
                          ref={(el) => { if (el) startDateRefsMap.current.set(day.id, el) }}
                          defaultValue={day.date}
                          onChange={(e) => updateDay(day.id, "date", e.target.value)}
                          className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-brand"
                        />

                        {/* 시작 시간 */}
                        <TimeSelect
                          value={day.startTime}
                          onChange={(v) => updateDay(day.id, "startTime", v)}
                          placeholder="시작"
                          hasError={hasTimeError}
                        />

                        {/* 종료 날짜 — 시작 날짜 이전 선택 불가 */}
                        <div className="relative">
                          <input
                            type="date"
                            ref={(el) => { if (el) endDateRefsMap.current.set(day.id, el) }}
                            defaultValue={day.endDate}
                            min={day.date || undefined}
                            onChange={(e) => {
                              const newEndDate = e.target.value
                              updateDay(day.id, "endDate", newEndDate)
                              // 종료 날짜가 시작 날짜와 같아지면 시작 시간 이전 종료 시간 초기화
                              if (newEndDate === day.date && day.endTime && day.startTime && day.endTime <= day.startTime) {
                                updateDay(day.id, "endTime", "")
                              }
                            }}
                            className={`border rounded-lg px-2 py-1.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-brand
                              ${endIsNextDay ? "border-indigo-300 bg-indigo-50" : "border-gray-200"}`}
                          />
                          {endIsNextDay && (
                            <span className="absolute -top-2 right-1 text-[9px] font-bold text-indigo-600 bg-white px-0.5">
                              +1일
                            </span>
                          )}
                        </div>

                        {/* 종료 시간 — 같은 날이면 시작 시간 이후만 선택 가능 */}
                        <TimeSelect
                          value={day.endTime}
                          onChange={(v) => updateDay(day.id, "endTime", v)}
                          placeholder="종료"
                          hasError={hasTimeError}
                          minTime={day.endDate === day.date && day.date ? day.startTime : undefined}
                        />

                        {/* 삭제 */}
                        <button
                          type="button"
                          onClick={() => removeDay(day.id)}
                          disabled={workDays.length === 1}
                          className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-400
                            hover:text-sos hover:bg-red-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        >
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
                  <MapPin className="w-3.5 h-3.5" />
                  집결지 주소
                </p>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">
                    {SOS_FORM.FIELDS.ADDRESS_LABEL}
                    <span className="text-sos ml-0.5">*</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={locationAddress}
                      placeholder="주소 검색 버튼을 눌러 주소를 선택해 주세요."
                      className={`flex-1 border rounded-xl px-4 py-2.5 text-sm bg-gray-50 cursor-default
                        ${errors.locationAddress ? "border-red-300 bg-red-50" : "border-gray-200"}`}
                    />
                    <button
                      type="button"
                      onClick={openAddressSearch}
                      className="flex items-center gap-1.5 px-4 py-2.5 bg-brand text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors shrink-0"
                    >
                      <Search className="w-4 h-4" />
                      주소 검색
                    </button>
                  </div>
                  {errors.locationAddress && <p className="text-xs text-sos mt-1">{errors.locationAddress}</p>}
                  <input
                    type="text"
                    value={locationDetail}
                    onChange={(e) => setLocationDetail(e.target.value)}
                    placeholder="상세 주소 입력 (동·호수, 층 등)"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                  />
                </div>
              </div>

              {/* 인력 조건 */}
              <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6 space-y-5">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" />
                  인력 조건
                </p>

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

              {/* 일급 + 설명 */}
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
                    <span className="text-sm text-gray-600">{SOS_FORM.FIELDS.HOURLY_RATE_UNIT}/일</span>
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

            {/* 우측 요약 카드 */}
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

                {workDays.filter((d) => d.date && d.startTime).length > 0 && (
                  <div className="pt-3 border-t border-gray-100 space-y-1.5">
                    <p className="text-xs font-semibold text-gray-400">날짜별 시간</p>
                    {workDays
                      .filter((d) => d.date)
                      .sort((a, b) => a.date.localeCompare(b.date))
                      .map((d) => (
                        <div key={d.id} className="flex justify-between text-xs">
                          <span className="text-gray-500">{d.date}</span>
                          <span className="text-gray-700 font-medium">
                            {d.startTime && d.endTime
                              ? `${d.startTime} ~ ${d.endDate && d.endDate !== d.date ? `${d.endDate} ` : ""}${d.endTime}`
                              : "시간 미입력"}
                          </span>
                        </div>
                      ))}
                  </div>
                )}

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

        {/* 주소 검색 모달 (팝업 대신 페이지 내 임베드) */}
        {addrModalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            onClick={(e) => { if (e.target === e.currentTarget) setAddrModalOpen(false) }}
          >
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <span className="font-semibold text-gray-900">주소 검색</span>
                <button
                  type="button"
                  onClick={() => setAddrModalOpen(false)}
                  className="text-gray-400 hover:text-gray-700 text-xl leading-none"
                >
                  ✕
                </button>
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
