"use client"

import { useState } from "react"
import Link from "next/link"
import { Search, MapPin, Star, Briefcase, SlidersHorizontal, Users } from "lucide-react"
import { EmptyState } from "@/components/ui/empty-state"
import { PageHeader } from "@/components/ui/page-header"
import {
  SEARCH_LABELS,
  WORK_FIELD_LABELS,
  CREDENTIAL_LABELS,
  AVAILABILITY_LABELS,
} from "@/lib/constants"

type WorkerResult = {
  id: string
  userId: string
  name: string
  workFields: string[]
  experienceYears: number
  desiredHourlyRate: number | null
  averageRating: number
  availability: string
  city: string
  district: string
  distanceM: number
  credentials: { type: string; status: string }[]
}

// ─────────────────────────────────────────
// AvailabilityDot
// ─────────────────────────────────────────

function AvailabilityDot({ status }: { status: string }) {
  const dotColor =
    status === "AVAILABLE"
      ? "bg-green-500"
      : status === "BUSY"
      ? "bg-amber-400"
      : "bg-gray-300"
  const label = AVAILABILITY_LABELS[status as keyof typeof AVAILABILITY_LABELS] ?? status
  return (
    <span className="flex items-center gap-1.5">
      <span className={`w-2 h-2 rounded-full shrink-0 ${dotColor}`} />
      <span className="text-xs text-gray-600">{label}</span>
    </span>
  )
}

// ─────────────────────────────────────────
// WorkerCard
// ─────────────────────────────────────────

function WorkerCard({ worker }: { worker: WorkerResult }) {
  const distanceLabel = SEARCH_LABELS.RESULT.DISTANCE_M(worker.distanceM)

  return (
    <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-5 space-y-4
                    hover:border-brand/30 hover:shadow-card-hover transition-all">
      {/* 상단: 이름 + 가용여부 + 거리 */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
            <span className="text-sm font-bold text-gray-500">
              {worker.name.charAt(0)}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-base font-bold text-gray-900">{worker.name}</p>
            <AvailabilityDot status={worker.availability} />
          </div>
        </div>
        <div className="text-right shrink-0">
          {worker.desiredHourlyRate ? (
            <p className="text-sm font-semibold text-brand">
              {worker.desiredHourlyRate.toLocaleString()}원/시간
            </p>
          ) : null}
          <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1 justify-end">
            <MapPin className="w-3 h-3" />
            {distanceLabel}
          </p>
        </div>
      </div>

      {/* 분야 */}
      {worker.workFields.length > 0 && (
        <div className="flex items-center gap-1.5 text-sm text-gray-600">
          <Briefcase className="w-3.5 h-3.5 shrink-0 text-gray-400" />
          <span className="truncate">
            {worker.workFields
              .map((f) => WORK_FIELD_LABELS[f as keyof typeof WORK_FIELD_LABELS] ?? f)
              .join(" · ")}
          </span>
        </div>
      )}

      {/* 경력 + 평점 + 위치 */}
      <div className="flex items-center gap-3 text-sm text-gray-500">
        <span className="flex items-center gap-1">
          <span className="font-medium text-gray-700">{worker.experienceYears}년</span> 경력
        </span>
        <span className="text-gray-200">|</span>
        <span className="flex items-center gap-0.5">
          <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
          <span className="font-medium text-gray-700">{worker.averageRating.toFixed(1)}</span>
        </span>
        <span className="text-gray-200">|</span>
        <span>{worker.city} {worker.district}</span>
      </div>

      {/* 자격증 배지 */}
      {worker.credentials.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {worker.credentials.map((cred) => {
            const label =
              CREDENTIAL_LABELS[cred.type as keyof typeof CREDENTIAL_LABELS] ?? cred.type
            return (
              <span
                key={cred.type}
                className="px-2.5 py-0.5 bg-blue-50 text-brand text-xs font-medium rounded-full"
              >
                {label}
              </span>
            )
          })}
        </div>
      )}

      {/* 프로필 보기 */}
      <div className="pt-1 border-t border-gray-50">
        <Link
          href={`/profile/${worker.userId}`}
          className="text-sm font-medium text-brand hover:text-blue-700 transition-colors"
        >
          {SEARCH_LABELS.RESULT.PROFILE_LINK} →
        </Link>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────
// 메인 페이지
// ─────────────────────────────────────────

export default function SearchPage() {
  const [radiusKm, setRadiusKm] = useState("20")
  const [workField, setWorkField] = useState("")
  const [credentialType, setCredentialType] = useState("")
  const [minExperience, setMinExperience] = useState("0")

  const [results, setResults] = useState<WorkerResult[] | null>(null)
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState("")

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setSearching(true)

    try {
      const coords = await new Promise<GeolocationCoordinates>((resolve, reject) => {
        if (!navigator.geolocation) {
          reject(new Error("이 브라우저는 위치 서비스를 지원하지 않습니다."))
          return
        }
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve(pos.coords),
          () => reject(new Error("위치 정보를 가져오지 못했습니다. 브라우저 위치 권한을 허용해 주세요.")),
          { timeout: 10000 }
        )
      })

      const params = new URLSearchParams({
        lat: String(coords.latitude),
        lng: String(coords.longitude),
        radiusKm: radiusKm || "20",
        minExperience: minExperience || "0",
      })
      if (workField) params.set("workField", workField)
      if (credentialType) params.set("credentialType", credentialType)

      const res = await fetch(`/api/search/workers?${params.toString()}`)
      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? SEARCH_LABELS.ERROR.SEARCH_FAILED)
        return
      }
      setResults(data.workers)
    } catch (err) {
      setError(err instanceof Error ? err.message : SEARCH_LABELS.ERROR.SEARCH_FAILED)
    } finally {
      setSearching(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <PageHeader
          title={SEARCH_LABELS.PAGE_TITLE}
          subtitle={SEARCH_LABELS.PAGE_SUBTITLE}
        />

        <div className="flex flex-row gap-6 items-start">
          {/* 좌측 필터 사이드바 */}
          <aside className="w-64 shrink-0 sticky top-20">
            <form onSubmit={handleSearch} className="bg-white rounded-2xl shadow-card border border-gray-100 overflow-hidden">
              {/* 필터 헤더 */}
              <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-50">
                <SlidersHorizontal className="w-4 h-4 text-gray-400" />
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">검색 조건</p>
              </div>

              <div className="px-5 pb-5 space-y-5 pt-4">

              {/* 반경 */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-600">{SEARCH_LABELS.FILTER.RADIUS_LABEL}</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={radiusKm}
                    onChange={(e) => setRadiusKm(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm
                               focus:outline-none focus:ring-2 focus:ring-brand transition-colors"
                  />
                  <span className="text-xs text-gray-400 shrink-0">km</span>
                </div>
              </div>

              <div className="h-px bg-gray-100" />

              {/* 업무 분야 */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-600">{SEARCH_LABELS.FILTER.WORK_FIELD_LABEL}</label>
                <select
                  value={workField}
                  onChange={(e) => setWorkField(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm
                             focus:outline-none focus:ring-2 focus:ring-brand transition-colors bg-white"
                >
                  <option value="">{SEARCH_LABELS.FILTER.WORK_FIELD_ALL}</option>
                  {(Object.keys(WORK_FIELD_LABELS) as (keyof typeof WORK_FIELD_LABELS)[]).map((key) => (
                    <option key={key} value={key}>{WORK_FIELD_LABELS[key]}</option>
                  ))}
                </select>
              </div>

              {/* 자격증 */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-600">{SEARCH_LABELS.FILTER.CREDENTIAL_LABEL}</label>
                <select
                  value={credentialType}
                  onChange={(e) => setCredentialType(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm
                             focus:outline-none focus:ring-2 focus:ring-brand transition-colors bg-white"
                >
                  <option value="">{SEARCH_LABELS.FILTER.CREDENTIAL_ALL}</option>
                  {(Object.keys(CREDENTIAL_LABELS) as (keyof typeof CREDENTIAL_LABELS)[]).map((key) => (
                    <option key={key} value={key}>{CREDENTIAL_LABELS[key]}</option>
                  ))}
                </select>
              </div>

              {/* 최소 경력 */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-600">{SEARCH_LABELS.FILTER.EXPERIENCE_LABEL}</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    value={minExperience}
                    onChange={(e) => setMinExperience(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm
                               focus:outline-none focus:ring-2 focus:ring-brand transition-colors"
                  />
                  <span className="text-xs text-gray-400 shrink-0">년</span>
                </div>
              </div>

              {error && (
                <p className="text-xs text-sos">{error}</p>
              )}

              <button
                type="submit"
                disabled={searching}
                className="w-full h-10 flex items-center justify-center gap-2
                           bg-brand text-white text-sm font-semibold rounded-xl
                           hover:bg-blue-700 transition-colors
                           disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <Search className="w-4 h-4" />
                {searching ? SEARCH_LABELS.FILTER.SEARCHING : SEARCH_LABELS.FILTER.SEARCH_BUTTON}
              </button>
              </div>
            </form>
          </aside>

          {/* 우측 결과 그리드 */}
          <div className="flex-1 min-w-0">
            {results === null ? (
              /* 초기 상태 */
              <div className="bg-white rounded-2xl shadow-card border border-gray-100">
                <EmptyState
                  icon={Users}
                  title="검색 조건을 설정해 주세요"
                  description="검색하기 버튼을 누르면 현재 위치 기준으로 인근 인력을 검색합니다."
                />
              </div>
            ) : results.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-card border border-gray-100">
                <EmptyState
                  icon={Users}
                  title={SEARCH_LABELS.RESULT.EMPTY}
                  description={SEARCH_LABELS.RESULT.EMPTY_HINT}
                />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-900">{SEARCH_LABELS.RESULT.HEADING}</p>
                  <span className="text-xs text-gray-400">{SEARCH_LABELS.RESULT.COUNT(results.length)}</span>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {results.map((worker) => (
                    <WorkerCard key={worker.id} worker={worker} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
