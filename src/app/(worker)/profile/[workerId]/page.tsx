import { notFound, redirect } from "next/navigation"
import { getServerSession } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { StatusBadge } from "@/components/ui/status-badge"
import { StatusDot } from "@/components/ui/status-dot"
import { Star, Award, MapPin, Clock, DollarSign, FileText, Info } from "lucide-react"
import {
  WORK_FIELD_LABELS,
  WORKER_PUBLIC_PROFILE,
  CREDENTIAL_LABELS,
  type WorkFieldKey,
  type CredentialTypeKey,
  type AvailabilityStatusKey,
} from "@/lib/constants"

interface Props {
  params: Promise<{ workerId: string }>
}

export default async function WorkerPublicProfilePage({ params }: Props) {
  const session = await getServerSession()

  if (!session?.user) {
    redirect("/login")
  }

  const { workerId } = await params

  const profile = await prisma.workerProfile.findUnique({
    where: { id: workerId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          deletedAt: true,
          // email, phone, kakaoId 제외 — 개인정보 보호
        },
      },
      credentials: {
        where: { status: "APPROVED" }, // 인증 완료 자격증만 공개
        orderBy: { approvedAt: "asc" },
      },
    },
  })

  if (!profile) notFound()
  if (!profile.user || profile.user.deletedAt) notFound()

  if (!profile.isProfilePublic) {
    return (
      <div className="max-w-xl mx-auto p-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-8 text-center">
          <p className="text-base font-semibold text-gray-700">비공개 프로필입니다.</p>
          <p className="text-sm text-gray-400 mt-2">이 인력은 프로필을 비공개로 설정했습니다.</p>
        </div>
      </div>
    )
  }

  const availabilityStatus = profile.availability as AvailabilityStatusKey
  const initials = (profile.user.name ?? "?").charAt(0).toUpperCase()

  // 본인 프로필 여부 확인
  const isSelf = session.user.id === profile.userId

  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-10">
      {/* 본인 배너 */}
      {isSelf && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-blue-50 border border-blue-100 text-blue-700 text-sm">
          <Info className="w-4 h-4 shrink-0" />
          <span>본인의 공개 프로필을 보고 있습니다. 다른 업체에도 이렇게 보입니다.</span>
        </div>
      )}

      {/* 헤더 카드 */}
      <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6">
        <div className="flex items-start gap-5">
          {/* 아바타 */}
          <div
            className="bg-brand text-white rounded-full flex items-center justify-center text-2xl font-bold shrink-0 select-none"
            style={{ width: 72, height: 72 }}
          >
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{profile.user.name}</h1>
                {profile.city && (
                  <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    {profile.city} {profile.district}
                  </p>
                )}
              </div>
              <StatusDot status={availabilityStatus} />
            </div>

            {/* 평점 */}
            <div className="flex items-center gap-1.5 mt-3">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-4 h-4 ${star <= Math.round(profile.averageRating) ? "text-yellow-400 fill-yellow-400" : "text-gray-200 fill-gray-200"}`}
                />
              ))}
              <span className="text-sm font-semibold text-gray-700 ml-1">
                {profile.averageRating > 0 ? profile.averageRating.toFixed(1) : "없음"}
              </span>
              <span className="text-sm text-gray-400">
                (총 {profile.totalMatches}건)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 전문 분야 */}
      <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-5">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          {WORKER_PUBLIC_PROFILE.WORK_FIELDS_LABEL}
        </h2>
        {profile.workFields.length === 0 ? (
          <p className="text-sm text-gray-400">등록된 업무 분야가 없습니다.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {profile.workFields.map((field) => (
              <span
                key={field}
                className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-50 text-blue-700 border border-blue-100"
              >
                {WORK_FIELD_LABELS[field as WorkFieldKey] ?? field}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 경력 정보 */}
      <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-5">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">경력 정보</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-50">
              <Clock className="w-5 h-5 text-brand" />
            </div>
            <div>
              <p className="text-xs text-gray-500">{WORKER_PUBLIC_PROFILE.EXPERIENCE_LABEL}</p>
              <p className="text-base font-bold text-gray-900">
                {profile.experienceYears}{WORKER_PUBLIC_PROFILE.EXPERIENCE_UNIT}
              </p>
            </div>
          </div>
          {profile.desiredHourlyRate != null && (
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-green-50">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">{WORKER_PUBLIC_PROFILE.HOURLY_RATE_LABEL}</p>
                <p className="text-base font-bold text-gray-900">
                  {profile.desiredHourlyRate.toLocaleString()}
                  <span className="text-xs font-normal text-gray-500 ml-1">원/시간</span>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 자격증 (APPROVED만) */}
      <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-5">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          {WORKER_PUBLIC_PROFILE.CREDENTIALS_LABEL}
        </h2>
        {profile.credentials.length === 0 ? (
          <p className="text-sm text-gray-400">인증된 자격증이 없습니다.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {profile.credentials.map((cred) => (
              <div
                key={cred.id}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-50 border border-green-100"
              >
                <Award className="w-3.5 h-3.5 text-green-600" />
                <span className="text-sm font-medium text-green-700">
                  {CREDENTIAL_LABELS[cred.type as CredentialTypeKey] ?? cred.type}
                </span>
                <StatusBadge variant="approved" label="인증" className="text-xs py-0" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 소개글 */}
      {profile.bio && (
        <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-5">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
            <FileText className="w-4 h-4" />
            {WORKER_PUBLIC_PROFILE.BIO_LABEL}
          </h2>
          <p className="text-sm text-gray-600 whitespace-pre-line leading-relaxed">{profile.bio}</p>
        </div>
      )}
    </div>
  )
}
