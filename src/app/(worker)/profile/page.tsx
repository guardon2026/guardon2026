import Link from "next/link"
import Image from "next/image"
import { getServerSession } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { PageHeader } from "@/components/ui/page-header"
import { StatusBadge } from "@/components/ui/status-badge"
import { EmptyState } from "@/components/ui/empty-state"
import { AvailabilityToggle } from "./availability-toggle"
import { Star, Award, MapPin, Clock, DollarSign, User, FileText, Scale, Ruler, Coins, ChevronRight, CheckCircle2, ShieldCheck, ShieldAlert } from "lucide-react"
import {
  WORKER_PUBLIC_PROFILE,
  WORK_FIELD_LABELS,
  CREDENTIAL_LABELS,
  type WorkFieldKey,
  type CredentialTypeKey,
  type AvailabilityStatusKey,
} from "@/lib/constants"

export default async function ProfilePage() {
  const session = await getServerSession()

  if (!session?.user?.id) {
    return (
      <div className="space-y-6">
        <PageHeader title={WORKER_PUBLIC_PROFILE.PAGE_TITLE} />
        <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-8 text-center">
          <p className="text-base font-semibold text-gray-700">로그인이 필요합니다.</p>
        </div>
      </div>
    )
  }

  const [profile, pointAccount, recentContracts] = await Promise.all([
    prisma.workerProfile.findUnique({
      where: { userId: session.user.id },
      include: {
        user: { select: { name: true, deletedAt: true } },
        credentials: {
          select: { id: true, type: true, status: true, approvedAt: true, rejectionReason: true },
          orderBy: { createdAt: "asc" },
        },
      },
    }),
    prisma.pointAccount.findUnique({
      where: { userId: session.user.id },
      select: { balance: true },
    }),
    prisma.sosMatch.findMany({
      where: {
        workerProfile: { userId: session.user.id },
        status: "CONFIRMED",
      },
      include: {
        sosRequest: { select: { title: true, scheduledAt: true } },
        workContract: { select: { employerSignedAt: true, workerSignedAt: true } },
      },
      orderBy: { confirmedAt: "desc" },
      take: 3,
    }),
  ])

  if (profile?.user?.deletedAt) {
    return (
      <div className="space-y-6">
        <PageHeader title={WORKER_PUBLIC_PROFILE.PAGE_TITLE} />
        <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-8 text-center">
          <p className="text-base font-semibold text-gray-700">접근할 수 없는 계정입니다.</p>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={WORKER_PUBLIC_PROFILE.PAGE_TITLE}
          action={
            <Link
              href="/profile/edit"
              className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-semibold bg-brand text-white hover:opacity-90 transition-opacity"
            >
              {WORKER_PUBLIC_PROFILE.NO_PROFILE_BUTTON}
            </Link>
          }
        />
        <EmptyState
          icon={User}
          title={WORKER_PUBLIC_PROFILE.NO_PROFILE_HEADING}
          description={WORKER_PUBLIC_PROFILE.NO_PROFILE_BODY}
          action={{ label: WORKER_PUBLIC_PROFILE.NO_PROFILE_BUTTON, href: "/profile/edit" }}
        />
      </div>
    )
  }

  const availabilityStatus = profile.availability as AvailabilityStatusKey
  const initials = (profile.user.name ?? "?").charAt(0).toUpperCase()

  // 자격증 상태별 배지 variant
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
      <PageHeader
        title={WORKER_PUBLIC_PROFILE.PAGE_TITLE}
        action={
          <Link
            href="/profile/edit"
            className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-semibold border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition-colors"
          >
            프로필 수정
          </Link>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── 좌측: 프로필 카드 ── */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6 space-y-5 sticky top-20">
            {/* 아바타 */}
            <div className="flex flex-col items-center gap-3 pb-5 border-b border-gray-100">
              <div className="rounded-full overflow-hidden flex items-center justify-center shrink-0"
                style={{ width: 72, height: 72 }}>
                {profile.profileImageUrl ? (
                  <Image src={profile.profileImageUrl} alt="" width={72} height={72} className="object-cover w-full h-full" unoptimized />
                ) : (
                  <div className="bg-brand text-white w-full h-full flex items-center justify-center text-2xl font-bold select-none">
                    {initials}
                  </div>
                )}
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-gray-900">{profile.user.name}</p>
                {profile.city && (
                  <p className="text-sm text-gray-500 mt-0.5 flex items-center justify-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    {profile.city} {profile.district}
                  </p>
                )}
              </div>
            </div>

            {/* 가용 상태 토글 */}
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">가용 상태</p>
              <AvailabilityToggle initialAvailability={availabilityStatus} />
            </div>

            {/* 별점 */}
            <div className="space-y-1">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">평점</p>
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-4 h-4 ${star <= Math.round(profile.averageRating) ? "text-yellow-400 fill-yellow-400" : "text-gray-200 fill-gray-200"}`}
                  />
                ))}
                <span className="text-sm font-semibold text-gray-700 ml-1">
                  {profile.averageRating > 0 ? profile.averageRating.toFixed(1) : "없음"}
                </span>
              </div>
            </div>

            {/* 총 매칭 건수 */}
            <div className="space-y-1">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">총 매칭</p>
              <p className="text-2xl font-bold text-gray-900">
                {profile.totalMatches}
                <span className="text-sm font-normal text-gray-500 ml-1">건</span>
              </p>
            </div>
          </div>
        </div>

        {/* ── 우측: 상세 정보 ── */}
        <div className="lg:col-span-2 space-y-5">
          {/* 전문 분야 */}
          <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-5">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              {WORKER_PUBLIC_PROFILE.WORK_FIELDS_LABEL}
            </h3>
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
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">경력 사항</h3>
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
              {profile.height != null && (
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-indigo-50">
                    <Ruler className="w-5 h-5 text-indigo-500" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">키</p>
                    <p className="text-base font-bold text-gray-900">
                      {profile.height}
                      <span className="text-xs font-normal text-gray-500 ml-1">cm</span>
                    </p>
                  </div>
                </div>
              )}
              {profile.weight != null && (
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-orange-50">
                    <Scale className="w-5 h-5 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">몸무게</p>
                    <p className="text-base font-bold text-gray-900">
                      {profile.weight}
                      <span className="text-xs font-normal text-gray-500 ml-1">kg</span>
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 기본 정보 (주소) */}
          {profile.city && (
            <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-5">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">기본 정보</h3>
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-purple-50">
                  <MapPin className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">활동 지역</p>
                  <p className="text-base font-bold text-gray-900">
                    {profile.city} {profile.district}
                    {profile.address && (
                      <span className="text-sm font-normal text-gray-500 ml-1">({profile.address})</span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 자격증 */}
          <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                {WORKER_PUBLIC_PROFILE.CREDENTIALS_LABEL}
              </h3>
              <Link
                href="/my-credentials"
                className="text-xs text-brand font-medium hover:underline"
              >
                자격증 관리
              </Link>
            </div>
            {profile.credentials.length === 0 ? (
              <p className="text-sm text-gray-400">{WORKER_PUBLIC_PROFILE.NO_CREDENTIALS}</p>
            ) : (
              <div className="space-y-2">
                {profile.credentials.map((cred) => (
                  <div
                    key={cred.id}
                    className="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-gray-50/50"
                  >
                    <div className="flex items-center gap-2">
                      <Award className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-700 font-medium">
                        {CREDENTIAL_LABELS[cred.type as CredentialTypeKey] ?? cred.type}
                      </span>
                    </div>
                    <StatusBadge
                      variant={credBadgeVariant(cred.status)}
                      label={credBadgeLabel(cred.status)}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 보유 자격증 자기신고 */}
          {(() => {
            const approvedTypes = profile.credentials.map((c) => c.type)
            const selfDeclared = (profile.declaredCredentials ?? []).filter(
              (d) => !approvedTypes.includes(d),
            )
            if (selfDeclared.length === 0) return null
            return (
              <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-5">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  보유 자격증 (자기신고)
                </h3>
                <div className="flex flex-wrap gap-2">
                  {selfDeclared.map((c) => (
                    <span
                      key={c}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-600 border border-gray-200"
                    >
                      {CREDENTIAL_LABELS[c as CredentialTypeKey] ?? c}
                    </span>
                  ))}
                </div>
              </div>
            )
          })()}

          {/* 소개글 */}
          {profile.bio && (
            <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-5">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                <FileText className="w-4 h-4" />
                {WORKER_PUBLIC_PROFILE.BIO_LABEL}
              </h3>
              <p className="text-sm text-gray-600 whitespace-pre-line leading-relaxed">{profile.bio}</p>
            </div>
          )}

          {/* 본인 인증 */}
          <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-brand" />
                본인 인증
              </h3>
              <Link href="/my-verification" className="text-xs text-brand font-medium hover:underline flex items-center gap-0.5">
                관리 <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className={`rounded-xl px-4 py-3 flex items-center gap-2 ${profile.rrnVerifiedAt ? "bg-green-50" : "bg-amber-50"}`}>
                {profile.rrnVerifiedAt
                  ? <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                  : <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0" />
                }
                <div>
                  <p className="text-xs font-semibold text-gray-700">주민등록번호</p>
                  <p className={`text-xs ${profile.rrnVerifiedAt ? "text-green-600" : "text-amber-600"}`}>
                    {profile.rrnVerifiedAt ? "인증 완료" : "미인증"}
                  </p>
                </div>
              </div>
              <div className={`rounded-xl px-4 py-3 flex items-center gap-2 ${profile.bankVerifiedAt ? "bg-green-50" : "bg-amber-50"}`}>
                {profile.bankVerifiedAt
                  ? <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                  : <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0" />
                }
                <div>
                  <p className="text-xs font-semibold text-gray-700">계좌 정보</p>
                  <p className={`text-xs ${profile.bankVerifiedAt ? "text-green-600" : "text-amber-600"}`}>
                    {profile.bankVerifiedAt ? (profile.bankName ?? "등록 완료") : "미등록"}
                  </p>
                </div>
              </div>
            </div>
          </div>

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
              <p className="text-2xl font-bold">{(pointAccount?.balance ?? 0).toLocaleString()}<span className="text-sm font-normal ml-1">P</span></p>
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
            {recentContracts.length === 0 ? (
              <p className="text-sm text-gray-400">확정된 매칭이 없습니다.</p>
            ) : (
              <div className="space-y-2">
                {recentContracts.map((m) => {
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
        </div>
      </div>
    </div>
  )
}
