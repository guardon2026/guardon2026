"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import Link from "next/link"
import Script from "next/script"
import Image from "next/image"
import {
  Star, Award, MapPin, Clock, DollarSign, FileText, Scale, Ruler, Coins, ChevronRight,
  CheckCircle2, ShieldCheck, ShieldAlert, Camera, Pencil, X, Save, Loader2,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { PageHeader } from "@/components/ui/page-header"
import { StatusBadge } from "@/components/ui/status-badge"
import { AvailabilityToggle } from "./availability-toggle"
import WithdrawSection from "./WithdrawSection"
import RrnSection from "./RrnSection"
import { ProfileCompletenessBanner } from "@/components/worker/ProfileCompletenessBanner"
import {
  WORKER_PROFILE,
  WORKER_PUBLIC_PROFILE,
  WORK_FIELD_LABELS,
  CREDENTIAL_LABELS,
  SOS_WORK_FIELD_OPTIONS,
  SOS_CREDENTIAL_OPTIONS,
  type WorkFieldKey,
  type CredentialTypeKey,
  type AvailabilityStatusKey,
} from "@/lib/constants"
import { cn, formatPhoneNumber } from "@/lib/utils"

const ALL_WORK_FIELDS = SOS_WORK_FIELD_OPTIONS as unknown as WorkFieldKey[]
const ALL_CREDENTIALS = SOS_CREDENTIAL_OPTIONS as unknown as CredentialTypeKey[]

const BANKS = [
  "KB국민은행", "신한은행", "우리은행", "하나은행", "IBK기업은행",
  "NH농협은행", "카카오뱅크", "토스뱅크", "케이뱅크", "SC제일은행",
  "씨티은행", "부산은행", "경남은행", "대구은행", "광주은행",
  "전북은행", "제주은행", "우체국", "새마을금고", "신협",
]

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

interface CredentialItem {
  id: string
  type: string
  status: string
  approvedAt: Date | null
  rejectionReason: string | null
}

interface ContractItem {
  id: string
  sosRequest: { title: string; scheduledAt: Date }
  workContract: { employerSignedAt: Date | null; workerSignedAt: Date | null } | null
}

export interface ProfileClientProps {
  hasProfile: boolean
  startEditing: boolean
  name: string
  phone: string | null
  profileImageUrl: string | null
  availability: AvailabilityStatusKey
  averageRating: number
  totalMatches: number
  address: string | null
  city: string | null
  district: string | null
  workFields: WorkFieldKey[]
  declaredCredentials: CredentialTypeKey[]
  experienceYears: number
  height: number | null
  weight: number | null
  desiredHourlyRate: number | null
  bio: string | null
  credentials: CredentialItem[]
  bankName: string | null
  bankAccount: string | null
  bankHolder: string | null
  bankVerifiedAt: Date | null
  rrnRegisteredAt: Date | null
  missingProfileItems: string[]
  pointBalance: number
  recentContracts: ContractItem[]
}

interface FormState {
  name: string
  phone: string
  workFields: WorkFieldKey[]
  declaredCredentials: CredentialTypeKey[]
  experienceYears: string
  height: string
  weight: string
  address: string
  city: string
  district: string
  desiredHourlyRate: string
  bio: string
  bankName: string
  bankAccount: string
  bankHolder: string
}

interface FormErrors {
  name?: string
  phone?: string
  workFields?: string
  address?: string
  experienceYears?: string
  height?: string
  weight?: string
  desiredHourlyRate?: string
  declaredCredentials?: string
  bio?: string
  avatar?: string
  general?: string
}

function buildForm(p: ProfileClientProps): FormState {
  return {
    name: p.name,
    phone: p.phone ?? "",
    workFields: p.workFields,
    declaredCredentials: p.declaredCredentials,
    experienceYears: String(p.experienceYears),
    height: p.height != null ? String(p.height) : "",
    weight: p.weight != null ? String(p.weight) : "",
    address: p.address ?? "",
    city: p.city ?? "",
    district: p.district ?? "",
    desiredHourlyRate: p.desiredHourlyRate != null ? String(p.desiredHourlyRate) : "",
    bio: p.bio ?? "",
    bankName: p.bankName ?? "",
    bankAccount: p.bankAccount ?? "",
    bankHolder: p.bankHolder ?? "",
  }
}

function validate(f: FormState): FormErrors {
  const errs: FormErrors = {}
  if (!f.name.trim()) errs.name = "이름을 입력해 주세요."
  if (!f.phone.trim()) {
    errs.phone = "연락처를 입력해 주세요."
  } else if (!/^01[016789]-\d{3,4}-\d{4}$/.test(f.phone.trim())) {
    errs.phone = "올바른 휴대폰 번호를 입력해 주세요."
  }
  if (f.workFields.length === 0) errs.workFields = WORKER_PROFILE.ERROR.WORK_FIELDS_REQUIRED
  if (!f.address.trim()) errs.address = WORKER_PROFILE.ERROR.ADDRESS_REQUIRED
  const expNum = Number(f.experienceYears)
  if (isNaN(expNum) || expNum < 0 || !Number.isInteger(expNum)) errs.experienceYears = WORKER_PROFILE.ERROR.EXPERIENCE_INVALID
  if (f.height === "") {
    errs.height = "키를 입력해 주세요."
  } else if (isNaN(Number(f.height)) || Number(f.height) < 100 || Number(f.height) > 250) {
    errs.height = "올바른 키를 입력해 주세요."
  }
  if (f.weight === "") {
    errs.weight = "몸무게를 입력해 주세요."
  } else if (isNaN(Number(f.weight)) || Number(f.weight) < 30 || Number(f.weight) > 200) {
    errs.weight = "올바른 몸무게를 입력해 주세요."
  }
  if (f.desiredHourlyRate === "") {
    errs.desiredHourlyRate = "희망 시급을 입력해 주세요."
  } else {
    const rateNum = Number(f.desiredHourlyRate)
    if (isNaN(rateNum) || rateNum < 0) errs.desiredHourlyRate = WORKER_PROFILE.ERROR.HOURLY_RATE_INVALID
  }
  if (f.declaredCredentials.length === 0) errs.declaredCredentials = "보유 자격증을 하나 이상 선택해 주세요."
  if (!f.bio.trim()) errs.bio = "자기소개를 입력해 주세요."
  const bankFilled = [f.bankName, f.bankAccount, f.bankHolder].filter((v) => v.trim() !== "").length
  if (bankFilled < 3) {
    errs.general = "계좌 정보(은행·계좌번호·예금주)를 모두 입력해 주세요."
  }
  return errs
}

export default function ProfileClient(props: ProfileClientProps) {
  const router = useRouter()
  const { update } = useSession()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [editing, setEditing] = useState(!props.hasProfile || props.startEditing)
  const [daumReady, setDaumReady] = useState(false)
  const [profileImageUrl, setProfileImageUrl] = useState(props.profileImageUrl)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [form, setForm] = useState<FormState>(() => buildForm(props))
  const [errors, setErrors] = useState<FormErrors>({})
  const [submitted, setSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // 한 번 저장을 시도해 오류가 표시된 뒤에는, 입력값을 수정할 때마다 즉시
  // 재검증해서 이미 채운 항목의 빨간 오류 문구가 다음 저장 시도 전까지
  // 남아있지 않도록 한다. avatar는 별도 업로드 흐름이라 여기서 건드리지 않는다.
  useEffect(() => {
    if (!submitted) return
    setErrors((prev) => ({ ...validate(form), avatar: prev.avatar }))
  }, [form, submitted])

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
        setErrors((prev) => ({ ...prev, address: undefined }))
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

  function toggleCredential(cred: CredentialTypeKey) {
    setForm((prev) => ({
      ...prev,
      declaredCredentials: prev.declaredCredentials.includes(cred)
        ? prev.declaredCredentials.filter((c) => c !== cred)
        : [...prev.declaredCredentials, cred],
    }))
  }

  function handleCancel() {
    setForm(buildForm(props))
    setProfileImageUrl(props.profileImageUrl)
    setAvatarFile(null)
    setAvatarPreview(null)
    setErrors({})
    setSubmitted(false)
    setEditing(false)
  }

  async function handleSave() {
    setSubmitted(true)
    const errs = validate(form)
    setErrors(errs)
    if (Object.keys(errs).length > 0) return

    setIsSubmitting(true)
    try {
      const newAvatarUrl = await uploadAvatar()
      if (avatarFile && newAvatarUrl === null) {
        setIsSubmitting(false)
        return
      }

      const body: Record<string, unknown> = {
        name: form.name.trim(),
        phone: form.phone.trim() || null,
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
        method: props.hasProfile ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setErrors({ general: d.error ?? WORKER_PROFILE.ERROR.SAVE_FAILED })
        return
      }

      const bankFilled = form.bankName.trim() && form.bankAccount.trim() && form.bankHolder.trim()
      if (bankFilled) {
        const bankRes = await fetch("/api/worker/verification", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "bank",
            bankName: form.bankName,
            bankAccount: form.bankAccount,
            bankHolder: form.bankHolder,
          }),
        })
        if (!bankRes.ok) {
          const d = await bankRes.json().catch(() => ({}))
          setErrors({ general: d.error ?? "계좌 정보 저장에 실패했습니다." })
          return
        }
      }

      if (newAvatarUrl) setProfileImageUrl(newAvatarUrl)
      setAvatarFile(null)
      setAvatarPreview(null)
      await update()
      setSubmitted(false)
      setEditing(false)
      setSuccessMsg(WORKER_PROFILE.SUCCESS)
      setTimeout(() => setSuccessMsg(null), 2500)
      router.refresh()
    } catch {
      setErrors({ general: WORKER_PROFILE.ERROR.SAVE_FAILED })
    } finally {
      setIsSubmitting(false)
    }
  }

  const displayImage = avatarPreview ?? profileImageUrl
  const initials = (form.name || "?").charAt(0).toUpperCase()

  function credBadgeVariant(status: string) {
    if (status === "APPROVED") return "approved" as const
    if (status === "PENDING") return "pending" as const
    return "rejected" as const
  }
  function credBadgeLabel(status: string) {
    if (status === "APPROVED") return "인증 완료"
    if (status === "PENDING") return "심사 중"
    return "반려"
  }

  return (
    <div className="space-y-6 pb-10">
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
        title={WORKER_PUBLIC_PROFILE.PAGE_TITLE}
        subtitle={!props.hasProfile ? WORKER_PUBLIC_PROFILE.NO_PROFILE_BODY : undefined}
        action={
          !editing ? (
            <button
              onClick={() => setEditing(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" />
              수정
            </button>
          ) : props.hasProfile ? (
            <button
              onClick={handleCancel}
              className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
            >
              <X className="w-4 h-4" />
              취소
            </button>
          ) : null
        }
      />

      {!editing && <ProfileCompletenessBanner missing={props.missingProfileItems} />}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── 좌측: 프로필 요약 카드 ── */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6 space-y-5 sticky top-20">
            <div className="flex flex-col items-center gap-3 pb-5 border-b border-gray-100">
              <div className="relative">
                <div className="rounded-full overflow-hidden flex items-center justify-center shrink-0" style={{ width: 72, height: 72 }}>
                  {displayImage ? (
                    <Image src={displayImage} alt="" width={72} height={72} className="object-cover w-full h-full" unoptimized />
                  ) : (
                    <div className="bg-brand text-white w-full h-full flex items-center justify-center text-2xl font-bold select-none">
                      {initials}
                    </div>
                  )}
                </div>
                {editing && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-brand text-white flex items-center justify-center shadow hover:opacity-90 transition-opacity"
                  >
                    <Camera className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              {editing && (
                <>
                  <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleAvatarChange} />
                  {errors.avatar && <p className="text-xs text-sos">{errors.avatar}</p>}
                </>
              )}
              <div className="text-center w-full">
                {editing ? (
                  <div className="space-y-1 text-left">
                    <Label htmlFor="name">실명</Label>
                    <Input
                      id="name"
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                      placeholder="업체·다른 경비 인력에게 표시될 이름"
                      maxLength={30}
                    />
                    <p className="text-xs text-gray-400">원활한 정산을 위해 실명으로 입력해 주세요.</p>
                    {errors.name && <p className="text-xs text-sos">{errors.name}</p>}
                  </div>
                ) : (
                  <>
                    <p className="text-xl font-bold text-gray-900">{form.name}</p>
                    {form.city && (
                      <p className="text-sm text-gray-500 mt-0.5 flex items-center justify-center gap-1">
                        <MapPin className="w-3.5 h-3.5" />
                        {form.city} {form.district}
                      </p>
                    )}
                  </>
                )}
              </div>
              {editing && (
                <div className="space-y-1 w-full text-left">
                  <Label htmlFor="phone">연락처</Label>
                  <Input
                    id="phone"
                    type="text"
                    inputMode="numeric"
                    value={form.phone}
                    onChange={(e) => setForm((p) => ({ ...p, phone: formatPhoneNumber(e.target.value) }))}
                    placeholder="010-0000-0000"
                    maxLength={13}
                  />
                  <p className="text-xs text-gray-400">SOS 신청·수락을 위해 연락처가 필요합니다.</p>
                  {errors.phone && <p className="text-xs text-sos">{errors.phone}</p>}
                </div>
              )}
            </div>

            {props.hasProfile && (
              <>
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">가용 상태</p>
                  <AvailabilityToggle initialAvailability={props.availability} />
                </div>

                <div className="space-y-1">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">평점</p>
                  <div className="flex items-center gap-1.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-4 h-4 ${star <= Math.round(props.averageRating) ? "text-yellow-400 fill-yellow-400" : "text-gray-200 fill-gray-200"}`}
                      />
                    ))}
                    <span className="text-sm font-semibold text-gray-700 ml-1">
                      {props.averageRating > 0 ? props.averageRating.toFixed(1) : "없음"}
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">총 매칭</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {props.totalMatches}
                    <span className="text-sm font-normal text-gray-500 ml-1">건</span>
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── 우측: 상세 정보 ── */}
        <div className="lg:col-span-2 space-y-5">
          {/* 전문 분야 */}
          <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-5">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              {WORKER_PUBLIC_PROFILE.WORK_FIELDS_LABEL}
            </h3>
            {editing ? (
              <>
                <p className="text-xs text-gray-500 mb-2">{WORKER_PROFILE.FIELDS.WORK_FIELDS_HINT}</p>
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
                {errors.workFields && <p className="text-xs text-sos mt-2">{errors.workFields}</p>}
              </>
            ) : form.workFields.length === 0 ? (
              <p className="text-sm text-gray-400">등록된 업무 분야가 없습니다.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {form.workFields.map((field) => (
                  <span key={field} className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-50 text-blue-700 border border-blue-100">
                    {WORK_FIELD_LABELS[field] ?? field}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* 경력 사항 */}
          <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-5">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">경력 사항</h3>
            {editing ? (
              <div className="space-y-4">
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
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="height">키</Label>
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
                    {errors.height && <p className="text-xs text-sos">{errors.height}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="weight">몸무게</Label>
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
                    {errors.weight && <p className="text-xs text-sos">{errors.weight}</p>}
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
                      className="w-32"
                    />
                    <span className="text-sm text-gray-600">{WORKER_PROFILE.FIELDS.HOURLY_RATE_UNIT}</span>
                  </div>
                  {errors.desiredHourlyRate && <p className="text-xs text-sos">{errors.desiredHourlyRate}</p>}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-50">
                    <Clock className="w-5 h-5 text-brand" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">{WORKER_PUBLIC_PROFILE.EXPERIENCE_LABEL}</p>
                    <p className="text-base font-bold text-gray-900">
                      {form.experienceYears}{WORKER_PUBLIC_PROFILE.EXPERIENCE_UNIT}
                    </p>
                  </div>
                </div>
                {form.desiredHourlyRate !== "" && (
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-green-50">
                      <DollarSign className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">{WORKER_PUBLIC_PROFILE.HOURLY_RATE_LABEL}</p>
                      <p className="text-base font-bold text-gray-900">
                        {Number(form.desiredHourlyRate).toLocaleString()}
                        <span className="text-xs font-normal text-gray-500 ml-1">원/시간</span>
                      </p>
                    </div>
                  </div>
                )}
                {form.height !== "" && (
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-indigo-50">
                      <Ruler className="w-5 h-5 text-indigo-500" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">키</p>
                      <p className="text-base font-bold text-gray-900">{form.height}<span className="text-xs font-normal text-gray-500 ml-1">cm</span></p>
                    </div>
                  </div>
                )}
                {form.weight !== "" && (
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-orange-50">
                      <Scale className="w-5 h-5 text-orange-500" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">몸무게</p>
                      <p className="text-base font-bold text-gray-900">{form.weight}<span className="text-xs font-normal text-gray-500 ml-1">kg</span></p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 기본 정보 (주소) */}
          <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-5">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">기본 정보</h3>
            {editing ? (
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
            ) : form.city ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-purple-50">
                  <MapPin className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">활동 지역</p>
                  <p className="text-base font-bold text-gray-900">
                    {form.city} {form.district}
                    {form.address && <span className="text-sm font-normal text-gray-500 ml-1">({form.address})</span>}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-400">등록된 주소가 없습니다.</p>
            )}
          </div>

          {/* 자격증 (관리자 승인) */}
          {props.hasProfile && (
            <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                  {WORKER_PUBLIC_PROFILE.CREDENTIALS_LABEL}
                </h3>
                <Link href="/my-credentials" className="text-xs text-brand font-medium hover:underline">
                  자격증 관리
                </Link>
              </div>
              {props.credentials.length === 0 ? (
                <p className="text-sm text-gray-400">{WORKER_PUBLIC_PROFILE.NO_CREDENTIALS}</p>
              ) : (
                <div className="space-y-2">
                  {props.credentials.map((cred) => (
                    <div key={cred.id} className="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-gray-50/50">
                      <div className="flex items-center gap-2">
                        <Award className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-700 font-medium">
                          {CREDENTIAL_LABELS[cred.type as CredentialTypeKey] ?? cred.type}
                        </span>
                      </div>
                      <StatusBadge variant={credBadgeVariant(cred.status)} label={credBadgeLabel(cred.status)} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 보유 자격증 (자기신고) */}
          <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-5">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">보유 자격증 (자기신고)</h3>
            {editing ? (
              <>
                <p className="text-xs text-gray-500 mb-2">보유한 자격증을 하나 이상 선택해 주세요.</p>
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
                {errors.declaredCredentials && <p className="text-xs text-sos mt-2">{errors.declaredCredentials}</p>}
              </>
            ) : (() => {
              const approvedTypes = props.credentials.map((c) => c.type)
              const selfDeclared = form.declaredCredentials.filter((d) => !approvedTypes.includes(d))
              return selfDeclared.length === 0 ? (
                <p className="text-sm text-gray-400">등록된 자기신고 자격증이 없습니다.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {selfDeclared.map((c) => (
                    <span key={c} className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-600 border border-gray-200">
                      {CREDENTIAL_LABELS[c] ?? c}
                    </span>
                  ))}
                </div>
              )
            })()}
          </div>

          {/* 소개글 */}
          <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-5">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <FileText className="w-4 h-4" />
              {WORKER_PUBLIC_PROFILE.BIO_LABEL}
            </h3>
            {editing ? (
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
                {errors.bio && <p className="text-xs text-sos mt-1">{errors.bio}</p>}
              </div>
            ) : form.bio ? (
              <p className="text-sm text-gray-600 whitespace-pre-line leading-relaxed">{form.bio}</p>
            ) : (
              <p className="text-sm text-gray-400">등록된 소개글이 없습니다.</p>
            )}
          </div>

          {/* 계좌 정보 */}
          <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-5">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-brand" />
              계좌 정보
            </h3>
            {editing ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">은행 선택</label>
                  <select
                    value={form.bankName}
                    onChange={(e) => setForm((p) => ({ ...p, bankName: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand bg-white"
                  >
                    <option value="">은행을 선택해 주세요</option>
                    {BANKS.map((b) => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">계좌번호</label>
                  <input
                    type="text"
                    value={form.bankAccount}
                    onChange={(e) => setForm((p) => ({ ...p, bankAccount: e.target.value.replace(/[^\d-]/g, "") }))}
                    placeholder="'-' 없이 숫자만 입력"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">예금주명</label>
                  <input
                    type="text"
                    value={form.bankHolder}
                    onChange={(e) => setForm((p) => ({ ...p, bankHolder: e.target.value }))}
                    placeholder="예금주 실명"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                  />
                </div>
                <p className="text-xs text-gray-400">급여 지급 및 포인트 출금에 사용됩니다. 입력 형식만 확인하며, 실제 예금주 일치 여부는 검증되지 않습니다.</p>
              </div>
            ) : (
              <div className={`rounded-xl px-4 py-3 flex items-center gap-2 ${props.bankVerifiedAt ? "bg-green-50" : "bg-amber-50"}`}>
                {props.bankVerifiedAt
                  ? <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                  : <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0" />
                }
                <div>
                  <p className="text-xs font-semibold text-gray-700">계좌 정보</p>
                  <p className={`text-xs ${props.bankVerifiedAt ? "text-green-600" : "text-amber-600"}`}>
                    {props.bankVerifiedAt ? `${form.bankName} · ${form.bankAccount} · ${form.bankHolder}` : "미등록"}
                  </p>
                </div>
              </div>
            )}
          </div>

          {props.hasProfile && <RrnSection registered={!!props.rrnRegisteredAt} />}

          {errors.general && <p className="text-sm text-sos text-center">{errors.general}</p>}

          {editing && (
            <button
              onClick={handleSave}
              disabled={isSubmitting || avatarUploading}
              className="w-full py-3 rounded-xl text-sm font-semibold bg-brand text-white hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting || avatarUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {isSubmitting || avatarUploading ? WORKER_PROFILE.SUBMITTING : WORKER_PROFILE.SUBMIT_BUTTON}
            </button>
          )}

          {props.hasProfile && (
            <>
              {/* 포인트 */}
              <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
                    <Coins className="w-4 h-4 text-amber-500" />
                    포인트
                  </h3>
                  <Link href="/my-points" className="text-xs text-brand font-medium hover:underline flex items-center gap-0.5">
                    전체 내역 <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>
                <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl px-5 py-4 text-white">
                  <p className="text-xs font-medium opacity-80 mb-1">현재 잔액</p>
                  <p className="text-2xl font-bold">{props.pointBalance.toLocaleString()}<span className="text-sm font-normal ml-1">P</span></p>
                </div>
              </div>

              {/* 근로계약서 */}
              <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
                    <FileText className="w-4 h-4" />
                    근로계약서
                  </h3>
                  <Link href="/worker-contracts" className="text-xs text-brand font-medium hover:underline flex items-center gap-0.5">
                    전체 보기 <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>
                {props.recentContracts.length === 0 ? (
                  <p className="text-sm text-gray-400">확정된 매칭이 없습니다.</p>
                ) : (
                  <div className="space-y-2">
                    {props.recentContracts.map((m) => {
                      const both = !!(m.workContract?.employerSignedAt && m.workContract?.workerSignedAt)
                      const scheduledDate = new Date(m.sosRequest.scheduledAt).toLocaleDateString("ko-KR", { month: "long", day: "numeric" })
                      return (
                        <Link
                          key={m.id}
                          href={`/worker-history/${m.id}/contract`}
                          className="flex items-center justify-between gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-gray-50 transition-colors group"
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <CheckCircle2 className={`w-4 h-4 shrink-0 ${both ? "text-green-500" : "text-gray-300"}`} />
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-800 truncate">{m.sosRequest.title}</p>
                              <p className="text-xs text-gray-400">{scheduledDate} · {both ? "서명 완료" : "서명 대기"}</p>
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 shrink-0" />
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            </>
          )}

          {!editing && props.hasProfile && <WithdrawSection />}
        </div>
      </div>
    </div>
  )
}
