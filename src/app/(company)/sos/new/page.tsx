"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Zap, MapPin, Calendar, Users, Minus, Plus, Search, Trash2, Coins } from "lucide-react"
import { WorkField, CredentialType } from "@prisma/client"
import { SOS_FORM, WORK_FIELD_LABELS, CREDENTIAL_LABELS, SOS_WORK_FIELD_OPTIONS, SOS_CREDENTIAL_OPTIONS } from "@/lib/constants"
import { PointChargeModal } from "@/components/ui/PointChargeModal"

// ─────────────────────────────────────────
// 날짜·시간 포맷 헬퍼
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

// ─────────────────────────────────────────
// 타입
// ─────────────────────────────────────────

interface WorkDay {
  id: number
  date: string       // 시작 날짜
  startTime: string
  endDate: string    // 종료 날짜 (다음 날이면 date+1)
  endTime: string
  requiredCount: number
}

// ─────────────────────────────────────────
// 유틸
// ─────────────────────────────────────────

// 초기 행은 고정 ID — SSR·클라이언트 hydration 일치를 위해 Math.random/Date.now 사용 금지
const INITIAL_DAY: WorkDay = { id: 1, date: "", startTime: "", endDate: "", endTime: "", requiredCount: 1 }

// 추가 행은 클라이언트 클릭 시에만 호출되므로 Date.now() 사용 가능
function makeDay(): WorkDay {
  return { id: Date.now(), date: "", startTime: "", endDate: "", endTime: "", requiredCount: 1 }
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

function formatComma(raw: string): string {
  const digits = raw.replace(/\D/g, "")
  if (!digits) return ""
  return Number(digits).toLocaleString("ko-KR")
}

function formatBusinessNumber(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 10)
  if (digits.length <= 3) return digits
  if (digits.length <= 5) return `${digits.slice(0, 3)}-${digits.slice(3)}`
  return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`
}

function formatPhoneNumber(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 11)
  if (digits.startsWith("02")) {
    if (digits.length <= 2) return digits
    if (digits.length <= 5) return `${digits.slice(0, 2)}-${digits.slice(2)}`
    if (digits.length <= 9) return `${digits.slice(0, 2)}-${digits.slice(2, 5)}-${digits.slice(5)}`
    return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6)}`
  }
  if (digits.length <= 3) return digits
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`
  if (digits.length <= 10) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`
}

export default function SosNewPage() {
  const router = useRouter()

  const [title, setTitle] = useState("")
  const [locationAddress, setLocationAddress] = useState("")
  const [locationDetail, setLocationDetail] = useState("")

  // 근무일 목록 — 초기값은 고정 ID (hydration 일치)
  const [workDays, setWorkDays] = useState<WorkDay[]>([INITIAL_DAY])
  // 로컬 날짜 (UTC 아님 — UTC 기준 시 한국 시간과 날짜가 달라질 수 있음)
  const localToday = new Date()
  const todayStr = [
    localToday.getFullYear(),
    String(localToday.getMonth() + 1).padStart(2, "0"),
    String(localToday.getDate()).padStart(2, "0"),
  ].join("-")
  // 날짜 입력 ref 배열 (submit 시 직접 읽기 — onChange 미발생 대비)
  const startDateRefsMap = useRef<Map<number, HTMLInputElement>>(new Map())
  const endDateRefsMap = useRef<Map<number, HTMLInputElement>>(new Map())

  const [requiredFields, setRequiredFields] = useState<WorkField[]>([])
  const [requiredCredentials, setRequiredCredentials] = useState<CredentialType[]>([])
  const [hourlyRate, setHourlyRate] = useState("")
  const [dressCode, setDressCode] = useState("")
  const [siteManagers, setSiteManagers] = useState([{ id: 1, name: "", phone: "", comment: "" }])
  const [description, setDescription] = useState("")
  const [urgencyLevel, setUrgencyLevel] = useState("URGENT")
  const [serviceType, setServiceType] = useState("경호·보안")
  const [applicationDeadline, setApplicationDeadline] = useState("")
  const [paymentMethod, setPaymentMethod] = useState("협의 후 정산")
  const [allowCompanyApplicants, setAllowCompanyApplicants] = useState(true)
  const [allowGuardApplicants, setAllowGuardApplicants] = useState(true)
  const [isAdConfirmed, setIsAdConfirmed] = useState(false)

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState("")
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [insufficientPoints, setInsufficientPoints] = useState(false)
  const [chargeModalOpen, setChargeModalOpen] = useState(false)
  const [pointShortfall, setPointShortfall] = useState(0)
  const [pointRequired, setPointRequired] = useState(0)
  const [pointCurrent, setPointCurrent] = useState(0)

  const workFieldOptions = SOS_WORK_FIELD_OPTIONS as unknown as WorkField[]
  const credentialOptions = SOS_CREDENTIAL_OPTIONS as unknown as CredentialType[]

  // 영수증/세금계산서
  const [receiptType, setReceiptType] = useState<"CASH_RECEIPT" | "TAX_INVOICE">("CASH_RECEIPT")
  // 현금영수증
  const [cashReceiptPurpose, setCashReceiptPurpose] = useState<"INCOME" | "EXPENSE">("INCOME")
  const [cashReceiptNumber, setCashReceiptNumber] = useState("")
  // 세금계산서
  const [taxBusinessNumber, setTaxBusinessNumber] = useState("")
  const [taxCompanyName, setTaxCompanyName] = useState("")
  const [taxCeoName, setTaxCeoName] = useState("")
  const [taxEmail, setTaxEmail] = useState("")
  const [taxEmailError, setTaxEmailError] = useState("")

  // 직전 충전 영수증 자동 적용
  const [lastReceipt, setLastReceipt] = useState<Record<string, string> | null>(null)
  const [lastReceiptDate, setLastReceiptDate] = useState<string | null>(null)
  const [receiptBannerDismissed, setReceiptBannerDismissed] = useState(false)

  useEffect(() => {
    fetch("/api/points/last-receipt")
      .then((r) => r.json())
      .then((data) => {
        if (data.receiptInfo) {
          setLastReceipt(data.receiptInfo)
          setLastReceiptDate(data.createdAt ?? null)
        }
      })
      .catch(() => {})
  }, [])

  function applyLastReceipt() {
    if (!lastReceipt) return
    setReceiptType(lastReceipt.type as "CASH_RECEIPT" | "TAX_INVOICE")
    if (lastReceipt.type === "CASH_RECEIPT") {
      setCashReceiptPurpose((lastReceipt.purpose ?? "INCOME") as "INCOME" | "EXPENSE")
      setCashReceiptNumber(lastReceipt.number ?? "")
    } else {
      setTaxBusinessNumber(lastReceipt.businessNumber ?? "")
      setTaxCompanyName(lastReceipt.companyName ?? "")
      setTaxCeoName(lastReceipt.ceoName ?? "")
      setTaxEmail(lastReceipt.email ?? "")
      setTaxEmailError("")
    }
    setReceiptBannerDismissed(true)
  }

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

  function updateDay(id: number, field: keyof Omit<WorkDay, "id">, value: string | number) {
    setWorkDays((prev) =>
      prev.map((d) => {
        if (d.id !== id) return d
        const updated = { ...d, [field]: value }
        // 시작 날짜 변경 시 종료 날짜가 비어있으면 자동 동기화
        if (field === "date" && !d.endDate) updated.endDate = value as string
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
    // 최소 12시간 전 신청 조건
    const minStart = new Date(Date.now() + 12 * 60 * 60 * 1000)
    const hasTooSoon = days.some((d) => {
      if (!d.date || !d.startTime) return false
      return new Date(`${d.date}T${d.startTime}`) < minStart
    })

    if (hasEmptyDate) newErrors.workDays = "모든 근무일의 날짜를 입력해 주세요."
    else if (hasEmptyTime) newErrors.workDays = "모든 근무일의 시작·종료 시간을 입력해 주세요."
    else if (hasInvalidTime) newErrors.workDays = "종료 일시는 시작 일시보다 이후여야 합니다."
    else if (hasTooSoon) newErrors.workDays = "배치 시작 일시는 현재 시각으로부터 최소 12시간 이후여야 합니다."

    if (requiredFields.length === 0) newErrors.requiredFields = SOS_FORM.ERROR.REQUIRED_FIELDS_REQUIRED
    if (!hourlyRate || Number(hourlyRate.replace(/,/g, "")) < 0) newErrors.hourlyRate = SOS_FORM.ERROR.HOURLY_RATE_INVALID

    if (!dressCode.trim()) newErrors.dressCode = "복장 규정을 입력해 주세요."
    if (!allowCompanyApplicants && !allowGuardApplicants) newErrors.applicantTypes = "업체 또는 개인 경호 인력 중 하나 이상을 허용해 주세요."
    if (applicationDeadline && new Date(applicationDeadline) <= new Date()) newErrors.applicationDeadline = "신청 마감은 현재 이후로 입력해 주세요."

    const hasContact = siteManagers.some((m) => m.name.trim() || m.phone.trim())
    if (!hasContact) newErrors.siteManagers = "현장 담당자 연락처를 입력해 주세요."
    if (!description.trim()) newErrors.description = "추가 설명을 입력해 주세요."
    if (!isAdConfirmed) newErrors.isAdConfirmed = "허위·광고성 게시글이 아님을 확인해 주세요."

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
            requiredCount: d.requiredCount || 1,
          })),
          requiredCount: days.reduce((sum, d) => sum + (d.requiredCount || 1), 0),
          requiredFields,
          requiredCredentials,
          hourlyRate: Number(hourlyRate.replace(/,/g, "")),
          urgencyLevel,
          serviceType: serviceType.trim() || "경호·보안",
          applicationDeadline: applicationDeadline ? new Date(applicationDeadline).toISOString() : null,
          budgetTotal: totalCharge,
          budgetPerPerson: Number(hourlyRate.replace(/,/g, "")),
          budgetType: "DAILY",
          paymentMethod: paymentMethod.trim() || null,
          allowCompanyApplicants,
          allowGuardApplicants,
          isAdConfirmed,
          dressCode: dressCode.trim() || null,
          siteManagerContact: siteManagers
            .map((m) => [m.name.trim(), m.phone.trim(), m.comment.trim()].filter(Boolean).join(" "))
            .filter(Boolean)
            .join("\n") || null,
          description: description.trim() || null,
          receiptInfo: receiptType === "CASH_RECEIPT"
            ? { type: "CASH_RECEIPT", purpose: cashReceiptPurpose, number: cashReceiptNumber.trim() }
            : { type: "TAX_INVOICE", businessNumber: taxBusinessNumber.trim(), companyName: taxCompanyName.trim(), ceoName: taxCeoName.trim(), email: taxEmail.trim() },
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        if (res.status === 402) {
          setInsufficientPoints(true)
          setSubmitError("")
          const req = data.requiredPoints ?? 0
          const cur = data.currentBalance ?? 0
          setPointRequired(req)
          setPointCurrent(cur)
          const shortfall = req - cur
          setPointShortfall(shortfall > 0 ? shortfall : 0)
        } else {
          setInsufficientPoints(false)
          setSubmitError(data.error ?? SOS_FORM.ERROR.SUBMIT_FAILED)
        }
        return
      }
      setInsufficientPoints(false)
      const data = await res.json()
      setSubmitSuccess(true)
      setTimeout(() => router.push(`/sos/${data.sosRequestId}`), 1500)
    } catch {
      setSubmitError(SOS_FORM.ERROR.SUBMIT_FAILED)
    } finally {
      setSubmitting(false)
    }
  }

  // 결제 금액 계산 (일별 인원 합산)
  const rateNum = hourlyRate ? Number(hourlyRate.replace(/,/g, "")) : 0
  const totalRequiredCount = workDays.reduce((sum, d) => sum + (d.requiredCount || 1), 0)
  const laborCost = rateNum * totalRequiredCount
  const serviceFee = rateNum > 0 ? Math.ceil(laborCost * 0.05) : 0
  const vat = rateNum > 0 ? Math.ceil((laborCost + serviceFee) * 0.1) : 0
  const totalCharge = laborCost + serviceFee + vat

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
    { label: "필요 인원", value: `총 ${totalRequiredCount}명` },
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
      value: hourlyRate ? `${Number(hourlyRate.replace(/,/g, "")).toLocaleString()}원/일` : "미입력",
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

              {/* 게시 조건 */}
              <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6 space-y-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">게시 조건</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label className="space-y-1.5">
                    <span className="text-xs font-medium text-gray-600">긴급도</span>
                    <select
                      value={urgencyLevel}
                      onChange={(e) => setUrgencyLevel(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand"
                    >
                      <option value="CRITICAL">즉시 투입</option>
                      <option value="URGENT">긴급</option>
                      <option value="FAST">빠른 모집</option>
                      <option value="NORMAL">일반</option>
                    </select>
                  </label>
                  <label className="space-y-1.5">
                    <span className="text-xs font-medium text-gray-600">서비스 유형</span>
                    <input
                      value={serviceType}
                      onChange={(e) => setServiceType(e.target.value)}
                      placeholder="행사경호, 의전, 시설보안 등"
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                    />
                  </label>
                  <label className="space-y-1.5">
                    <span className="text-xs font-medium text-gray-600">신청 마감</span>
                    <input
                      type="datetime-local"
                      value={applicationDeadline}
                      onChange={(e) => setApplicationDeadline(e.target.value)}
                      className={`w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand ${errors.applicationDeadline ? "border-red-300 bg-red-50" : "border-gray-200"}`}
                    />
                    {errors.applicationDeadline && <p className="text-xs text-sos">{errors.applicationDeadline}</p>}
                  </label>
                  <label className="space-y-1.5">
                    <span className="text-xs font-medium text-gray-600">정산 방식</span>
                    <input
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      placeholder="계약서, 세금계산서, 현장 정산 등"
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                    />
                  </label>
                </div>
                <div className="flex flex-wrap gap-3">
                  <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={allowCompanyApplicants}
                      onChange={(e) => setAllowCompanyApplicants(e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    업체 신청 허용
                  </label>
                  <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={allowGuardApplicants}
                      onChange={(e) => setAllowGuardApplicants(e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    개인 경호 인력 신청 허용
                  </label>
                </div>
                {errors.applicantTypes && <p className="text-xs text-sos">{errors.applicantTypes}</p>}
                <label className="flex items-start gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={isAdConfirmed}
                    onChange={(e) => setIsAdConfirmed(e.target.checked)}
                    className="mt-0.5 rounded border-gray-300"
                  />
                  <span>이 글은 실제 경호·보안 인력 모집이며 광고, 홍보, 허위 모집이 아닙니다.</span>
                </label>
                {errors.isAdConfirmed && <p className="text-xs text-sos">{errors.isAdConfirmed}</p>}
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
                <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  ⏰ 배치 시작 일시는 현재 시각으로부터 <span className="font-semibold">최소 12시간 이후</span>부터 신청 가능합니다.
                </p>

                {/* 근무일 테이블 */}
                <div className="rounded-xl border border-gray-200 overflow-hidden">
                  {/* 헤더 */}
                  <div className="grid grid-cols-[1fr_80px_1fr_80px_72px_36px] bg-gray-50 px-3 py-2.5 text-xs font-semibold text-gray-500 border-b border-gray-200 gap-2">
                    <span>시작 날짜 <span className="text-sos">*</span></span>
                    <span>시작 시간 <span className="text-sos">*</span></span>
                    <span>종료 날짜 <span className="text-sos">*</span></span>
                    <span>종료 시간 <span className="text-sos">*</span></span>
                    <span>필요 인원 <span className="text-sos">*</span></span>
                    <span />
                  </div>

                  {/* 행 */}
                  {workDays.map((day, idx) => {
                    const hasTimeError = !!(
                      day.date && day.endDate && day.startTime && day.endTime &&
                      new Date(`${day.endDate}T${day.endTime}`) <= new Date(`${day.date}T${day.startTime}`)
                    )
                    const minAllowed = new Date(Date.now() + 12 * 60 * 60 * 1000)
                    const isTooSoon = !!(
                      day.date && day.startTime &&
                      new Date(`${day.date}T${day.startTime}`) < minAllowed
                    )
                    const minAllowedStr = isTooSoon
                      ? minAllowed.toLocaleString("ko-KR", {
                          month: "numeric", day: "numeric",
                          hour: "2-digit", minute: "2-digit", hour12: true,
                        })
                      : ""
                    return (
                      <div key={day.id}>
                        <div
                          className={`grid grid-cols-[1fr_80px_1fr_80px_72px_36px] items-center px-3 py-2.5 gap-2
                            ${idx % 2 === 0 ? "bg-white" : "bg-gray-50/50"}
                            ${idx < workDays.length - 1 && !isTooSoon ? "border-b border-gray-100" : ""}
                          `}
                        >
                        {/* 시작 날짜 */}
                        <input
                          type="date"
                          ref={(el) => { if (el) startDateRefsMap.current.set(day.id, el) }}
                          defaultValue={day.date}
                          min={todayStr}
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
                            onChange={(e) => updateDay(day.id, "endDate", e.target.value)}
                            className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-brand"
                          />
                        </div>

                        {/* 종료 시간 — 같은 날 + 시작 시간 이전 선택 시 종료 날짜 자동 +1일 */}
                        <TimeSelect
                          value={day.endTime}
                          onChange={(v) => {
                            // 같은 날인데 종료 시간 ≤ 시작 시간이면 종료 날짜를 익일로 자동 설정
                            if (day.date && day.endDate === day.date && day.startTime && v <= day.startTime) {
                              const next = new Date(day.date)
                              next.setDate(next.getDate() + 1)
                              const nextStr = next.toISOString().slice(0, 10)
                              setWorkDays((prev) =>
                                prev.map((d) =>
                                  d.id === day.id ? { ...d, endTime: v, endDate: nextStr } : d
                                )
                              )
                            } else {
                              updateDay(day.id, "endTime", v)
                            }
                          }}
                          placeholder="종료"
                          hasError={hasTimeError}
                        />

                        {/* 필요 인원 */}
                        <div className="flex items-center gap-1 border border-gray-200 rounded-lg overflow-hidden">
                          <button
                            type="button"
                            onClick={() => updateDay(day.id, "requiredCount", Math.max(1, (day.requiredCount || 1) - 1))}
                            className="w-6 h-7 flex items-center justify-center bg-gray-50 hover:bg-gray-100 text-gray-600 text-sm"
                          >-</button>
                          <span className="flex-1 text-center text-sm font-semibold text-gray-900">{day.requiredCount || 1}</span>
                          <button
                            type="button"
                            onClick={() => updateDay(day.id, "requiredCount", (day.requiredCount || 1) + 1)}
                            className="w-6 h-7 flex items-center justify-center bg-gray-50 hover:bg-gray-100 text-gray-600 text-sm"
                          >+</button>
                        </div>

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
                        {isTooSoon && (
                          <p className={`text-xs text-red-600 px-3 py-1.5 bg-red-50 border-t border-red-100
                            ${idx < workDays.length - 1 ? "border-b border-b-gray-100" : ""}`}>
                            ⚠️ 현재 시각으로부터 12시간 이내입니다. {minAllowedStr} 이후로 시작 일시를 조정해 주세요.
                          </p>
                        )}
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

              {/* 복장 규정 */}
              <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6 space-y-3">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                  복장 규정
                  <span className="text-sos ml-0.5">*</span>
                </p>
                <input
                  type="text"
                  value={dressCode}
                  onChange={(e) => setDressCode(e.target.value)}
                  placeholder="예) 정장, 전술복, 검정 면 바지에 흰색 셔츠 등"
                  className={`w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand
                    ${errors.dressCode ? "border-red-300 bg-red-50" : "border-gray-200"}`}
                />
                {errors.dressCode && <p className="text-xs text-sos">{errors.dressCode}</p>}
              </div>

              {/* 현장 담당자 연락처 */}
              <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">현장 담당자 연락처 <span className="text-sos normal-case">*</span></p>
                  <button
                    type="button"
                    onClick={() => setSiteManagers((prev) => [...prev, { id: Date.now(), name: "", phone: "", comment: "" }])}
                    className="flex items-center gap-1 text-xs text-brand font-medium hover:underline"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    담당자 추가
                  </button>
                </div>
                <p className="text-xs text-gray-400 -mt-2">현장 도착 후 경비 인력이 연락할 담당자 정보를 입력해 주세요.</p>
                {errors.siteManagers && <p className="text-xs text-sos -mt-2">{errors.siteManagers}</p>}
                <div className="space-y-3">
                  {siteManagers.map((m, idx) => (
                    <div key={m.id} className="flex gap-2 items-center">
                      <div className="flex gap-2 flex-1 min-w-0">
                        <input
                          type="text"
                          value={m.name}
                          onChange={(e) => setSiteManagers((prev) => prev.map((s) => s.id === m.id ? { ...s, name: e.target.value } : s))}
                          placeholder="이름"
                          className="w-20 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand shrink-0"
                        />
                        <input
                          type="text"
                          inputMode="numeric"
                          value={m.phone}
                          onChange={(e) => {
                            const v = e.target.value
                            const stripped = v.replace(/-/g, "")
                            const formatted = /^\d+$/.test(stripped) ? formatPhoneNumber(stripped) : v
                            setSiteManagers((prev) => prev.map((s) => s.id === m.id ? { ...s, phone: formatted } : s))
                          }}
                          placeholder="전화번호"
                          className="w-36 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand shrink-0"
                        />
                        <input
                          type="text"
                          value={m.comment}
                          onChange={(e) => setSiteManagers((prev) => prev.map((s) => s.id === m.id ? { ...s, comment: e.target.value } : s))}
                          placeholder="예) 주간 담당자"
                          className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                        />
                      </div>
                      {siteManagers.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setSiteManagers((prev) => prev.filter((s) => s.id !== m.id))}
                          className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:text-sos hover:bg-red-50 transition-colors shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
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
                      type="text"
                      inputMode="numeric"
                      value={hourlyRate}
                      onChange={(e) => setHourlyRate(formatComma(e.target.value))}
                      placeholder={SOS_FORM.FIELDS.HOURLY_RATE_PLACEHOLDER}
                      className={`w-40 border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand
                        ${errors.hourlyRate ? "border-red-300 bg-red-50" : "border-gray-200"}`}
                    />
                    <span className="text-sm text-gray-600">{SOS_FORM.FIELDS.HOURLY_RATE_UNIT}/일</span>
                  </div>
                  {errors.hourlyRate && <p className="text-xs text-sos mt-1">{errors.hourlyRate}</p>}
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">
                    {SOS_FORM.FIELDS.DESCRIPTION_LABEL}
                    <span className="text-sos ml-0.5">*</span>
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={SOS_FORM.FIELDS.DESCRIPTION_PLACEHOLDER}
                    rows={3}
                    className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand resize-none
                      ${errors.description ? "border-red-300 bg-red-50" : "border-gray-200"}`}
                  />
                  {errors.description && <p className="text-xs text-sos">{errors.description}</p>}
                </div>
              </div>

              {/* 영수증 / 세금계산서 발행 */}
              <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6 space-y-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">지출 영수증 발행</p>
                <p className="text-xs text-gray-500 -mt-2">SOS 확정 후 인건비 + 가드온 수수료 합산 금액에 대한 지출 영수증(현금영수증 또는 세금계산서)을 발행해 드립니다.</p>

                {/* 직전 충전 영수증 자동 적용 배너 */}
                {lastReceipt && !receiptBannerDismissed && (
                  <div className="flex items-start gap-3 rounded-xl bg-blue-50 border border-blue-200 px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-blue-800">직전 지출 영수증 발행 정보를 적용하시겠습니까?</p>
                      <p className="text-xs text-blue-600 mt-0.5">
                        {lastReceipt.type === "CASH_RECEIPT"
                          ? `현금영수증 · ${lastReceipt.purpose === "INCOME" ? "소득공제용" : "지출증빙용"} · ${lastReceipt.number ?? ""}`
                          : `세금계산서 · ${lastReceipt.companyName ?? ""} · ${lastReceipt.businessNumber ?? ""}`}
                        {lastReceiptDate && (
                          <span className="ml-1 text-blue-400">
                            ({new Date(lastReceiptDate).toLocaleDateString("ko-KR", { month: "long", day: "numeric" })} 충전 시 등록)
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={applyLastReceipt}
                        className="text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg px-3 py-1.5 transition-colors"
                      >
                        적용
                      </button>
                      <button
                        type="button"
                        onClick={() => setReceiptBannerDismissed(true)}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-800 rounded-lg px-2 py-1.5 transition-colors"
                      >
                        닫기
                      </button>
                    </div>
                  </div>
                )}

                {/* 발행 유형 선택 */}
                <div className="flex gap-3">
                  {([
                    { value: "CASH_RECEIPT", label: "현금영수증" },
                    { value: "TAX_INVOICE", label: "세금계산서" },
                  ] as const).map(({ value, label }) => (
                    <label key={value} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="receiptType"
                        value={value}
                        checked={receiptType === value}
                        onChange={() => setReceiptType(value)}
                        className="accent-brand"
                      />
                      <span className="text-sm text-gray-700">{label}</span>
                    </label>
                  ))}
                </div>

                {/* 현금영수증 */}
                {receiptType === "CASH_RECEIPT" && (
                  <div className="space-y-3 pt-1">
                    <div className="flex gap-4">
                      {([
                        { value: "INCOME", label: "소득공제용 (휴대폰번호)" },
                        { value: "EXPENSE", label: "지출증빙용 (사업자번호)" },
                      ] as const).map(({ value, label }) => (
                        <label key={value} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="cashReceiptPurpose"
                            value={value}
                            checked={cashReceiptPurpose === value}
                            onChange={() => { setCashReceiptPurpose(value); setCashReceiptNumber("") }}
                            className="accent-brand"
                          />
                          <span className="text-sm text-gray-700">{label}</span>
                        </label>
                      ))}
                    </div>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={cashReceiptNumber}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/[^\d]/g, "")
                        setCashReceiptNumber(
                          cashReceiptPurpose === "INCOME" ? formatPhoneNumber(raw) : formatBusinessNumber(raw)
                        )
                      }}
                      placeholder={cashReceiptPurpose === "INCOME" ? "예) 010-1234-5678" : "예) 123-45-67890"}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                    />
                  </div>
                )}

                {/* 세금계산서 */}
                {receiptType === "TAX_INVOICE" && (
                  <div className="space-y-3 pt-1">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-gray-600">사업자등록번호 <span className="text-sos">*</span></label>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={taxBusinessNumber}
                          onChange={(e) => setTaxBusinessNumber(formatBusinessNumber(e.target.value.replace(/\D/g, "")))}
                          placeholder="000-00-00000"
                          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-gray-600">상호 <span className="text-sos">*</span></label>
                        <input
                          type="text"
                          value={taxCompanyName}
                          onChange={(e) => setTaxCompanyName(e.target.value)}
                          placeholder="법인명 또는 상호"
                          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-gray-600">대표자명 <span className="text-sos">*</span></label>
                        <input
                          type="text"
                          value={taxCeoName}
                          onChange={(e) => setTaxCeoName(e.target.value)}
                          placeholder="홍길동"
                          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-gray-600">이메일 <span className="text-sos">*</span></label>
                        <input
                          type="text"
                          inputMode="email"
                          value={taxEmail}
                          onChange={(e) => {
                            const v = e.target.value
                            setTaxEmail(v)
                            setTaxEmailError(v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? "올바른 이메일 형식이 아닙니다." : "")
                          }}
                          placeholder="tax@example.com"
                          className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand ${taxEmailError ? "border-red-300 bg-red-50" : "border-gray-200"}`}
                        />
                        {taxEmailError && <p className="text-xs text-red-500 mt-1">{taxEmailError}</p>}
                      </div>
                    </div>
                    <p className="text-xs text-gray-400">입력하신 이메일로 세금계산서가 발송됩니다.</p>
                  </div>
                )}
              </div>

              {/* 결제 내역 */}
              {rateNum > 0 && (
                <div className="bg-gray-50 rounded-xl border border-gray-200 px-5 py-4 space-y-2 text-sm">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">결제 내역</p>
                  <div className="flex justify-between text-gray-600">
                    <span>인건비 (총 {totalRequiredCount}명 × {rateNum.toLocaleString()}원)</span>
                    <span>{laborCost.toLocaleString()}P</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>SOS 긴급 요청 서비스 비용 (5%)</span>
                    <span>{serviceFee.toLocaleString()}P</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>부가세 (인건비 + 서비스 비용의 10%)</span>
                    <span>{vat.toLocaleString()}P</span>
                  </div>
                  <div className="h-px bg-gray-200" />
                  <div className="flex justify-between font-bold text-gray-900">
                    <span>총 결제 포인트</span>
                    <span className="text-brand">{totalCharge.toLocaleString()}P</span>
                  </div>
                </div>
              )}

              {(submitError || insufficientPoints) && (
                <div className="space-y-3">
                  {insufficientPoints ? (
                    <div className="rounded-xl bg-red-50 border border-red-200 p-4 space-y-3">
                      <p className="text-sm font-semibold text-sos">포인트가 부족합니다.</p>
                      <div className="space-y-1.5 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-500">보유 포인트</span>
                          <span className="font-medium text-gray-800">{pointCurrent.toLocaleString()}P</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">필요 포인트</span>
                          <span className="font-medium text-gray-800">{pointRequired.toLocaleString()}P</span>
                        </div>
                        <div className="flex justify-between border-t border-red-200 pt-1.5">
                          <span className="font-semibold text-sos">부족 포인트</span>
                          <span className="font-bold text-sos">{(pointRequired - pointCurrent).toLocaleString()}P</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setChargeModalOpen(true)}
                        className="w-full h-11 flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm rounded-xl transition-colors"
                      >
                        <Coins className="w-4 h-4" />
                        포인트 즉시 충전하고 SOS 긴급 요청 발송하기
                      </button>
                    </div>
                  ) : (
                    <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-sos">
                      {submitError}
                    </div>
                  )}
                </div>
              )}

              {submitSuccess && (
                <div className="rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700 font-medium flex items-center gap-2">
                  <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  SOS 긴급 요청 발송이 완료되었습니다. 잠시 후 상세 페이지로 이동합니다.
                </div>
              )}

              {!insufficientPoints && (
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
              )}
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

                {workDays.filter((d) => d.date).length > 0 && (
                  <div className="pt-3 border-t border-gray-100 space-y-2">
                    <p className="text-xs font-semibold text-gray-400">날짜별 시간</p>
                    {workDays
                      .filter((d) => d.date)
                      .sort((a, b) => a.date.localeCompare(b.date))
                      .map((d) => {
                        const overnight = d.endDate && d.endDate !== d.date
                        return (
                          <div key={d.id} className="space-y-0.5">
                            <p className="text-xs font-semibold text-gray-600">{formatDateShort(d.date)}</p>
                            {d.startTime || d.endTime ? (
                              <p className="text-xs text-gray-500">
                                {d.startTime ? formatTimeKorean(d.startTime) : "시작 미입력"}
                                {" → "}
                                {d.endTime
                                  ? <>
                                      {overnight && (
                                        <span className="text-indigo-500 font-medium mr-0.5">
                                          {formatDateShort(d.endDate)}
                                        </span>
                                      )}
                                      {formatTimeKorean(d.endTime)}
                                    </>
                                  : "종료 미입력"}
                              </p>
                            ) : (
                              <p className="text-xs text-gray-300">시간 미입력</p>
                            )}
                          </div>
                        )
                      })}
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

        {/* 포인트 충전 모달 — 충전 완료 후 폼 자동 제출 */}
        {chargeModalOpen && (
          <PointChargeModal
            shortfall={pointShortfall}
            showReceipt
            onClose={() => setChargeModalOpen(false)}
            onSuccess={() => {
              setChargeModalOpen(false)
              setSubmitError("")
              setInsufficientPoints(false)
              // 충전 완료 후 폼 재제출
              const form = document.querySelector<HTMLFormElement>("form")
              form?.requestSubmit()
            }}
          />
        )}

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
