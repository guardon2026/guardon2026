---
name: guardon-ui-components
description: "GuardOn 핵심 UI 컴포넌트 스킬. 자격증 뱃지, 별점, 인력 카드, SOS 요청 폼(react-hook-form+zod), SOS 현황 카드(30초 폴링), 가용 상태 토글, 네비게이션 헤더, 공통 유틸(cn/formatKRW)을 구현한다."
---

# GuardOn — 핵심 UI 컴포넌트 스킬

## 목적
GuardOn MVP의 핵심 UI 컴포넌트를 구현한다.
- 업체 대표: SOS 요청 폼, 인력 검색/필터, SOS 현황 카드
- 인력: 프로필 카드, 가용 상태 토글, SOS 수락 화면
- 공통: 자격증 뱃지, 별점 컴포넌트, 네비게이션 헤더

PRD 참조: `/G360/guardon-prd.md` — FR5, FR6, FR12~FR16, FR20~FR23

---

## Step 1. 공통 유틸 (clsx + tailwind-merge)

`src/lib/utils.ts`:
```typescript
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatKRW(amount: number): string {
  return new Intl.NumberFormat("ko-KR").format(amount) + "원"
}

export function formatPhone(phone: string): string {
  return phone.replace(/(\d{3})(\d{4})(\d{4})/, "$1-$2-$3")
}

export function formatRelativeTime(date: Date): string {
  const diff = Date.now() - new Date(date).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return "방금 전"
  if (minutes < 60) return `${minutes}분 전`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}시간 전`
  return new Date(date).toLocaleDateString("ko-KR")
}
```

---

## Step 2. 자격증 뱃지 컴포넌트 (FR10, FR11)

`src/components/ui/CredentialBadge.tsx`:
```typescript
import { cn } from "@/lib/utils"
import { Shield, ShieldCheck } from "lucide-react"

const CREDENTIAL_LABELS: Record<string, string> = {
  SECURITY_INSTRUCTOR: "경비지도사",
  BODYGUARD: "신변보호사",
  SECURITY_TRAINING: "신임교육",
  SPECIAL_SECURITY: "특수경비",
  CIVIL_POLICE: "청원경찰",
  KRAV_MAGA: "크라브마가",
}

interface CredentialBadgeProps {
  type: string
  size?: "sm" | "md"
}

export function CredentialBadge({ type, size = "md" }: CredentialBadgeProps) {
  const label = CREDENTIAL_LABELS[type] ?? type

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-medium",
        "bg-blue-50 text-blue-700 border border-blue-200",
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm"
      )}
    >
      <ShieldCheck className={size === "sm" ? "w-3 h-3" : "w-4 h-4"} />
      {label}
    </span>
  )
}
```

---

## Step 3. 별점 컴포넌트 (FR30, FR31)

`src/components/ui/StarRating.tsx`:
```typescript
import { Star } from "lucide-react"
import { cn } from "@/lib/utils"

interface StarRatingProps {
  rating: number   // 0~5
  count?: number   // 리뷰 수
  size?: "sm" | "md"
  interactive?: boolean
  onChange?: (rating: number) => void
}

export function StarRating({
  rating,
  count,
  size = "md",
  interactive = false,
  onChange,
}: StarRatingProps) {
  const starSize = size === "sm" ? "w-3.5 h-3.5" : "w-5 h-5"

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={cn(
            starSize,
            star <= Math.round(rating) ? "fill-yellow-400 text-yellow-400" : "text-gray-300",
            interactive && "cursor-pointer hover:text-yellow-400 transition-colors"
          )}
          onClick={() => interactive && onChange?.(star)}
        />
      ))}
      {count !== undefined && (
        <span className={cn("text-gray-500 ml-1", size === "sm" ? "text-xs" : "text-sm")}>
          {rating.toFixed(1)} ({count})
        </span>
      )}
    </div>
  )
}
```

---

## Step 4. 인력 프로필 카드 (FR12~FR15)

`src/components/worker/WorkerCard.tsx`:
```typescript
import { CredentialBadge } from "@/components/ui/CredentialBadge"
import { StarRating } from "@/components/ui/StarRating"
import { formatKRW } from "@/lib/utils"
import { MapPin, Briefcase, Clock } from "lucide-react"

const AVAILABILITY_CONFIG = {
  AVAILABLE: { label: "가용", color: "bg-green-100 text-green-700" },
  UNAVAILABLE: { label: "미가용", color: "bg-gray-100 text-gray-500" },
  BUSY: { label: "배치 중", color: "bg-yellow-100 text-yellow-700" },
}

const WORK_FIELD_LABELS: Record<string, string> = {
  GENERAL_SECURITY: "일반경비",
  BODYGUARD_SERVICE: "신변보호",
  SPECIAL_SECURITY: "특수경비",
  KRAV_MAGA_INSTRUCTOR: "크라브마가",
  EVENT_SECURITY: "행사경비",
}

interface WorkerCardProps {
  worker: {
    id: string
    user: { name: string }
    workFields: string[]
    experienceYears: number
    city: string
    district: string
    desiredHourlyRate?: number | null
    averageRating: number
    totalMatches: number
    availability: "AVAILABLE" | "UNAVAILABLE" | "BUSY"
    credentials: { type: string }[]
  }
  onContact?: (workerId: string) => void
}

export function WorkerCard({ worker, onContact }: WorkerCardProps) {
  const avail = AVAILABILITY_CONFIG[worker.availability]

  return (
    <div className="bg-white rounded-xl shadow hover:shadow-md transition-shadow p-5 border border-gray-100">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900">{worker.user.name}</h3>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${avail.color}`}>
              {avail.label}
            </span>
          </div>
          <StarRating
            rating={worker.averageRating}
            count={worker.totalMatches}
            size="sm"
          />
        </div>
        {worker.desiredHourlyRate && (
          <div className="text-right">
            <p className="text-sm text-gray-500">희망 시급</p>
            <p className="font-semibold text-blue-700">
              {formatKRW(worker.desiredHourlyRate)}/h
            </p>
          </div>
        )}
      </div>

      <div className="mt-3 space-y-1.5 text-sm text-gray-600">
        <div className="flex items-center gap-1.5">
          <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <span>{worker.city} {worker.district}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Briefcase className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <span>{worker.workFields.map((f) => WORK_FIELD_LABELS[f] ?? f).join(" · ")}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <span>경력 {worker.experienceYears}년 · 매칭 {worker.totalMatches}건</span>
        </div>
      </div>

      {worker.credentials.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {worker.credentials.map((c) => (
            <CredentialBadge key={c.type} type={c.type} size="sm" />
          ))}
        </div>
      )}

      {onContact && worker.availability === "AVAILABLE" && (
        <button
          onClick={() => onContact(worker.id)}
          className="mt-4 w-full py-2 bg-blue-600 text-white text-sm rounded-lg 
                     hover:bg-blue-700 transition-colors font-medium"
        >
          연락하기
        </button>
      )}
    </div>
  )
}
```

---

## Step 5. SOS 요청 폼 (FR17)

`src/components/sos/SosRequestForm.tsx`:
```typescript
"use client"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { WorkField, CredentialType } from "@prisma/client"
import { useRouter } from "next/navigation"
import { formatKRW } from "@/lib/utils"

const SosFormSchema = z.object({
  title: z.string().min(2, "제목을 입력하세요"),
  location: z.string().min(5, "집결지 주소를 입력하세요"),
  city: z.string().min(1),
  district: z.string().min(1),
  latitude: z.number(),
  longitude: z.number(),
  scheduledAt: z.string().min(1, "배치 일시를 선택하세요"),
  requiredCount: z.number().min(1).max(50),
  requiredFields: z.array(z.nativeEnum(WorkField)).min(1, "분야를 선택하세요"),
  requiredCredentials: z.array(z.nativeEnum(CredentialType)).optional(),
  hourlyRate: z.number().min(9860, "최저시급 이상이어야 합니다"),
  description: z.string().optional(),
})

type SosFormData = z.infer<typeof SosFormSchema>

const WORK_FIELD_LABELS: Record<string, string> = {
  GENERAL_SECURITY: "일반경비",
  BODYGUARD_SERVICE: "신변보호",
  SPECIAL_SECURITY: "특수경비",
  KRAV_MAGA_INSTRUCTOR: "크라브마가강사",
  EVENT_SECURITY: "행사경비",
}

const CREDENTIAL_LABELS: Record<string, string> = {
  SECURITY_INSTRUCTOR: "경비지도사",
  BODYGUARD: "신변보호사",
  SECURITY_TRAINING: "신임경비교육이수",
  SPECIAL_SECURITY: "특수경비원",
}

export function SosRequestForm() {
  const router = useRouter()
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<SosFormData>({
    resolver: zodResolver(SosFormSchema),
    defaultValues: {
      requiredCount: 1,
      hourlyRate: 12000,
      requiredFields: [],
      requiredCredentials: [],
      latitude: 37.5665,  // 기본값: 서울
      longitude: 126.9780,
    },
  })

  const hourlyRate = watch("hourlyRate")

  const onSubmit = async (data: SosFormData) => {
    const res = await fetch("/api/sos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })

    if (res.ok) {
      const sos = await res.json()
      router.push(`/company/sos/${sos.id}`)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
      {/* 제목 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">SOS 제목</label>
        <input
          {...register("title")}
          placeholder="예: 강남 행사 경비 긴급 구인"
          className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>}
      </div>

      {/* 집결지 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">집결지 주소</label>
        <input
          {...register("location")}
          placeholder="예: 서울 강남구 테헤란로 123 OO빌딩 앞"
          className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        {errors.location && <p className="text-red-500 text-xs mt-1">{errors.location.message}</p>}
      </div>

      {/* 지역 */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">시/도</label>
          <select
            {...register("city")}
            className="w-full border rounded-lg px-3 py-2 text-sm"
          >
            <option value="">선택</option>
            {["서울", "경기", "인천", "부산", "대구", "대전", "광주", "울산", "세종"].map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">배치 일시</label>
          <input
            type="datetime-local"
            {...register("scheduledAt")}
            className="w-full border rounded-lg px-3 py-2 text-sm"
          />
          {errors.scheduledAt && (
            <p className="text-red-500 text-xs mt-1">{errors.scheduledAt.message}</p>
          )}
        </div>
      </div>

      {/* 필요 분야 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">필요 분야 (복수 선택)</label>
        <div className="grid grid-cols-3 gap-2">
          {Object.entries(WORK_FIELD_LABELS).map(([value, label]) => (
            <label
              key={value}
              className="flex items-center gap-2 p-2 border rounded-lg cursor-pointer hover:bg-blue-50 text-sm"
            >
              <input
                type="checkbox"
                value={value}
                {...register("requiredFields")}
                className="w-4 h-4"
              />
              {label}
            </label>
          ))}
        </div>
        {errors.requiredFields && (
          <p className="text-red-500 text-xs mt-1">{errors.requiredFields.message}</p>
        )}
      </div>

      {/* 필요 자격증 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          필요 자격증 <span className="text-gray-400 font-normal">(선택)</span>
        </label>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(CREDENTIAL_LABELS).map(([value, label]) => (
            <label
              key={value}
              className="flex items-center gap-2 p-2 border rounded-lg cursor-pointer hover:bg-blue-50 text-sm"
            >
              <input
                type="checkbox"
                value={value}
                {...register("requiredCredentials")}
                className="w-4 h-4"
              />
              {label}
            </label>
          ))}
        </div>
      </div>

      {/* 인원 + 시급 */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">필요 인원</label>
          <input
            type="number"
            min={1}
            max={50}
            {...register("requiredCount", { valueAsNumber: true })}
            className="w-full border rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            시급 <span className="text-blue-600">({formatKRW(hourlyRate || 0)}/h)</span>
          </label>
          <input
            type="number"
            step={100}
            {...register("hourlyRate", { valueAsNumber: true })}
            className="w-full border rounded-lg px-3 py-2 text-sm"
          />
        </div>
      </div>

      {/* 메모 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          추가 요청 사항 <span className="text-gray-400 font-normal">(선택)</span>
        </label>
        <textarea
          {...register("description")}
          rows={3}
          placeholder="복장, 준비물, 주의사항 등..."
          className="w-full border rounded-lg px-3 py-2 text-sm resize-none"
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full py-3 bg-red-600 text-white font-semibold rounded-xl 
                   hover:bg-red-700 disabled:opacity-50 transition-colors text-lg"
      >
        {isSubmitting ? "발송 중..." : "🚨 SOS 발송"}
      </button>
    </form>
  )
}
```

---

## Step 6. SOS 현황 카드 (FR23)

`src/components/sos/SosStatusCard.tsx`:
```typescript
"use client"
import { useEffect, useState } from "react"
import { formatRelativeTime, formatKRW } from "@/lib/utils"
import { Users, MapPin, Clock, Radio } from "lucide-react"

const STATUS_CONFIG = {
  DISPATCHING: {
    label: "발송 중",
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    icon: Radio,
    description: "반경 20km 인력에게 알림을 발송했습니다.",
  },
  PENDING: {
    label: "수락 대기",
    color: "text-yellow-600",
    bgColor: "bg-yellow-50",
    icon: Clock,
    description: "인력이 수락했습니다. 확정할 인력을 선택하세요.",
  },
  CONFIRMED: {
    label: "배치 확정",
    color: "text-green-600",
    bgColor: "bg-green-50",
    icon: Users,
    description: "배치가 완료되었습니다.",
  },
  UNRESOLVED: {
    label: "미해결",
    color: "text-red-600",
    bgColor: "bg-red-50",
    icon: Clock,
    description: "1시간 내 매칭되지 않았습니다.",
  },
}

interface SosResponse {
  id: string
  status: string
  workerProfile: {
    id: string
    experienceYears: number
    averageRating: number
    user: { name: string; phone?: string }
    credentials: { type: string }[]
  }
}

interface SosStatusCardProps {
  sosId: string
}

export function SosStatusCard({ sosId }: SosStatusCardProps) {
  const [sos, setSos] = useState<any>(null)
  const [confirming, setConfirming] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  useEffect(() => {
    const fetchSos = async () => {
      const res = await fetch(`/api/sos/${sosId}`)
      if (res.ok) setSos(await res.json())
    }
    fetchSos()
    // 30초마다 폴링
    const interval = setInterval(fetchSos, 30_000)
    return () => clearInterval(interval)
  }, [sosId])

  const handleConfirm = async () => {
    if (selected.size === 0) return
    setConfirming(true)
    await fetch(`/api/sos/${sosId}/confirm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workerProfileIds: Array.from(selected) }),
    })
    const res = await fetch(`/api/sos/${sosId}`)
    setSos(await res.json())
    setConfirming(false)
  }

  if (!sos) return <div className="animate-pulse h-48 bg-gray-100 rounded-xl" />

  const config = STATUS_CONFIG[sos.status as keyof typeof STATUS_CONFIG]
  const Icon = config?.icon ?? Clock
  const acceptedResponses = (sos.responses ?? []).filter(
    (r: SosResponse) => ["ACCEPTED", "CONFIRMED"].includes(r.status)
  )

  return (
    <div className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden">
      {/* 헤더 */}
      <div className={`p-4 ${config?.bgColor ?? "bg-gray-50"}`}>
        <div className="flex items-center gap-2">
          <Icon className={`w-5 h-5 ${config?.color}`} />
          <span className={`font-semibold ${config?.color}`}>{config?.label}</span>
          <span className="text-gray-400 text-sm ml-auto">
            {formatRelativeTime(sos.createdAt)}
          </span>
        </div>
        <p className="text-sm text-gray-600 mt-1">{config?.description}</p>
      </div>

      {/* SOS 상세 */}
      <div className="p-4 space-y-2 text-sm border-b">
        <h3 className="font-semibold text-gray-900 text-base">{sos.title}</h3>
        <div className="flex items-center gap-1.5 text-gray-600">
          <MapPin className="w-4 h-4 text-gray-400" />
          {sos.location}
        </div>
        <div className="flex items-center gap-1.5 text-gray-600">
          <Users className="w-4 h-4 text-gray-400" />
          필요 {sos.requiredCount}명 · {formatKRW(sos.hourlyRate)}/h
        </div>
        <div className="flex items-center gap-1.5 text-gray-500 text-xs">
          <Radio className="w-3.5 h-3.5" />
          발송 반경: {sos.radiusKm}km
        </div>
      </div>

      {/* 수락자 목록 */}
      {acceptedResponses.length > 0 && sos.status !== "CONFIRMED" && (
        <div className="p-4">
          <p className="text-sm font-medium text-gray-700 mb-3">
            수락한 인력 ({acceptedResponses.length}명)
          </p>
          <div className="space-y-2">
            {acceptedResponses.map((r: SosResponse) => (
              <label
                key={r.id}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  selected.has(r.workerProfile.id)
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <input
                  type="checkbox"
                  checked={selected.has(r.workerProfile.id)}
                  onChange={(e) => {
                    const next = new Set(selected)
                    if (e.target.checked) next.add(r.workerProfile.id)
                    else next.delete(r.workerProfile.id)
                    setSelected(next)
                  }}
                  disabled={
                    !selected.has(r.workerProfile.id) &&
                    selected.size >= sos.requiredCount
                  }
                  className="w-4 h-4"
                />
                <div className="flex-1">
                  <p className="font-medium text-sm">{r.workerProfile.user.name}</p>
                  <p className="text-xs text-gray-500">
                    경력 {r.workerProfile.experienceYears}년 · 
                    평점 {r.workerProfile.averageRating.toFixed(1)}
                  </p>
                </div>
              </label>
            ))}
          </div>

          <button
            onClick={handleConfirm}
            disabled={selected.size === 0 || confirming}
            className="mt-4 w-full py-2.5 bg-green-600 text-white rounded-lg text-sm 
                       font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {confirming
              ? "확정 중..."
              : `선택 인력 확정 (${selected.size}/${sos.requiredCount}명)`}
          </button>
        </div>
      )}

      {/* 확정 완료 상태 */}
      {sos.status === "CONFIRMED" && (
        <div className="p-4">
          <p className="text-sm font-medium text-gray-700 mb-2">확정된 인력</p>
          {acceptedResponses
            .filter((r: SosResponse) => r.status === "CONFIRMED")
            .map((r: SosResponse) => (
              <div key={r.id} className="p-3 bg-green-50 rounded-lg">
                <p className="font-medium text-sm text-green-900">
                  {r.workerProfile.user.name}
                </p>
                {r.workerProfile.user.phone && (
                  <p className="text-xs text-green-700 mt-0.5">
                    {r.workerProfile.user.phone}
                  </p>
                )}
              </div>
            ))}
        </div>
      )}
    </div>
  )
}
```

---

## Step 7. 인력 가용 상태 토글 (FR6)

`src/components/worker/AvailabilityToggle.tsx`:
```typescript
"use client"
import { useState } from "react"
import { cn } from "@/lib/utils"

type AvailabilityStatus = "AVAILABLE" | "UNAVAILABLE" | "BUSY"

interface AvailabilityToggleProps {
  currentStatus: AvailabilityStatus
}

const STATUS_OPTIONS: { value: AvailabilityStatus; label: string; color: string }[] = [
  { value: "AVAILABLE", label: "가용", color: "bg-green-500" },
  { value: "UNAVAILABLE", label: "미가용", color: "bg-gray-400" },
]

export function AvailabilityToggle({ currentStatus }: AvailabilityToggleProps) {
  const [status, setStatus] = useState(currentStatus)
  const [loading, setLoading] = useState(false)

  const handleToggle = async (newStatus: AvailabilityStatus) => {
    if (newStatus === status || loading) return
    setLoading(true)
    try {
      await fetch("/api/workers/availability", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ availability: newStatus }),
      })
      setStatus(newStatus)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm font-medium text-gray-700">SOS 수신 상태</span>
      <div className="flex rounded-full border border-gray-200 p-0.5 bg-gray-50">
        {STATUS_OPTIONS.map(({ value, label, color }) => (
          <button
            key={value}
            onClick={() => handleToggle(value)}
            disabled={loading || status === "BUSY"}
            className={cn(
              "px-4 py-1.5 rounded-full text-sm font-medium transition-all",
              status === value
                ? `${color} text-white shadow-sm`
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            {label}
          </button>
        ))}
      </div>
      {status === "BUSY" && (
        <span className="text-xs text-yellow-600 bg-yellow-50 px-2 py-1 rounded-full">
          배치 중
        </span>
      )}
    </div>
  )
}
```

---

## Step 8. 인력 가용 상태 업데이트 API

`src/app/api/workers/availability/route.ts`:
```typescript
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { AvailabilityStatus } from "@prisma/client"

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== "WORKER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { availability } = await req.json()
  if (!["AVAILABLE", "UNAVAILABLE"].includes(availability)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 })
  }

  // BUSY 상태는 자동 설정만 가능 (인력 직접 변경 불가)
  const current = await prisma.workerProfile.findUnique({
    where: { userId: session.user.id },
    select: { availability: true },
  })
  if (current?.availability === "BUSY") {
    return NextResponse.json({ error: "배치 중에는 상태를 변경할 수 없습니다." }, { status: 400 })
  }

  const profile = await prisma.workerProfile.update({
    where: { userId: session.user.id },
    data: { availability: availability as AvailabilityStatus },
  })

  return NextResponse.json({ availability: profile.availability })
}
```

---

## Step 9. 네비게이션 헤더

`src/components/ui/Header.tsx`:
```typescript
import { auth } from "@/lib/auth"
import { signOut } from "@/lib/auth"
import Link from "next/link"
import { NotificationBadge } from "./NotificationBadge"
import { Shield } from "lucide-react"

export async function Header() {
  const session = await auth()
  const role = session?.user?.role

  const navLinks = {
    COMPANY_OWNER: [
      { href: "/company/sos", label: "SOS 요청" },
      { href: "/company/search", label: "인력 검색" },
      { href: "/company/history", label: "매칭 이력" },
    ],
    WORKER: [
      { href: "/worker/notifications", label: "SOS 알림" },
      { href: "/worker/profile", label: "내 프로필" },
      { href: "/worker/history", label: "배치 이력" },
    ],
    ADMIN: [
      { href: "/admin", label: "관리자" },
    ],
  }

  const links = role ? navLinks[role] ?? [] : []

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-xl text-blue-700">
          <Shield className="w-6 h-6" />
          GuardOn
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          {links.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              {label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <NotificationBadge />
          <form
            action={async () => {
              "use server"
              await signOut({ redirectTo: "/login" })
            }}
          >
            <button className="text-sm text-gray-500 hover:text-gray-700">
              로그아웃
            </button>
          </form>
        </div>
      </div>
    </header>
  )
}
```

---

## 성공 기준
- `WorkerCard` 컴포넌트에 자격증 뱃지, 별점, 가용 상태 정상 렌더링
- `SosRequestForm`에서 유효성 검사 통과 후 POST /api/sos 호출
- `SosStatusCard` 30초 폴링으로 상태 자동 갱신
- `AvailabilityToggle` BUSY 상태 시 버튼 비활성화
- `Header` 역할별 네비게이션 링크 정확히 분기
