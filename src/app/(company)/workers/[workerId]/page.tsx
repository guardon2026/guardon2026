import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "@/lib/session"
import { UserRole, CredentialStatus } from "@prisma/client"
import { PageHeader } from "@/components/ui/page-header"
import {
  WORK_FIELD_LABELS,
  CREDENTIAL_LABELS,
  AVAILABILITY_LABELS,
} from "@/lib/constants"
import { Star, Briefcase, MapPin, ArrowLeft, ShieldCheck, User, Phone, Mail } from "lucide-react"

export default async function WorkerProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ workerId: string }>
  searchParams: Promise<{ from?: string }>
}) {
  const session = await getServerSession()
  if (!session?.user?.id) redirect("/login")
  if (session.user.role !== UserRole.COMPANY_OWNER) redirect("/unauthorized")

  const { workerId } = await params
  const { from } = await searchParams

  const company = await prisma.company.findUnique({
    where: { ownerId: session.user.id },
    select: { id: true },
  })

  const user = await prisma.user.findUnique({
    where: { id: workerId, deletedAt: null },
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      workerProfile: {
        include: {
          credentials: {
            where: { status: CredentialStatus.APPROVED },
            select: { type: true, issuedDate: true, approvedAt: true },
          },
        },
      },
    },
  })

  if (!user?.workerProfile || !user.workerProfile.isProfilePublic) notFound()

  // 이 업체와 확정 매칭된 인력인지 확인 → 확정 시 연락처 공개
  const isConfirmed = company
    ? await prisma.sosMatch.findFirst({
        where: {
          workerProfileId: user.workerProfile.id,
          status: "CONFIRMED",
          sosRequest: { companyId: company.id },
        },
        select: { id: true },
      })
    : null

  const p = user.workerProfile

  const availabilityLabel = AVAILABILITY_LABELS[p.availability as keyof typeof AVAILABILITY_LABELS] ?? p.availability
  const dotColor =
    p.availability === "AVAILABLE" ? "bg-green-500"
    : p.availability === "BUSY" ? "bg-amber-400"
    : "bg-gray-300"

  const backHref = from ?? "/search"

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">

        <Link href={backHref} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          돌아가기
        </Link>

        <PageHeader title="경비 인력 프로필" />

        {/* 기본 정보 카드 */}
        <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6 space-y-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
              {p.profileImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.profileImageUrl} alt={user.name ?? ""} className="w-14 h-14 rounded-full object-cover" />
              ) : (
                <User className="w-7 h-7 text-gray-400" />
              )}
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900">{user.name ?? "이름 없음"}</p>
              <span className="inline-flex items-center gap-1.5 mt-1">
                <span className={`w-2 h-2 rounded-full ${dotColor}`} />
                <span className="text-sm text-gray-600">{availabilityLabel}</span>
              </span>
            </div>
            <div className="ml-auto text-right">
              <div className="flex items-center gap-1 justify-end">
                <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                <span className="font-semibold text-gray-800">{p.averageRating.toFixed(1)}</span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">매칭 {p.totalMatches}건</p>
            </div>
          </div>

          <div className="h-px bg-gray-100" />

          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-xs text-gray-400 mb-1">경력</dt>
              <dd className="font-semibold text-gray-800">{p.experienceYears}년</dd>
            </div>
            {p.desiredHourlyRate && (
              <div>
                <dt className="text-xs text-gray-400 mb-1">희망 시급</dt>
                <dd className="font-semibold text-gray-800">{p.desiredHourlyRate.toLocaleString()}원</dd>
              </div>
            )}
            {p.height && (
              <div>
                <dt className="text-xs text-gray-400 mb-1">키</dt>
                <dd className="font-semibold text-gray-800">{p.height}cm</dd>
              </div>
            )}
            {p.weight && (
              <div>
                <dt className="text-xs text-gray-400 mb-1">몸무게</dt>
                <dd className="font-semibold text-gray-800">{p.weight}kg</dd>
              </div>
            )}
            <div className="col-span-2">
              <dt className="text-xs text-gray-400 mb-1 flex items-center gap-1">
                <MapPin className="w-3 h-3" /> 활동 지역
              </dt>
              <dd className="font-semibold text-gray-800">{p.city} {p.district}</dd>
            </div>
          </dl>

          {p.bio && (
            <>
              <div className="h-px bg-gray-100" />
              <div>
                <p className="text-xs text-gray-400 mb-2">자기소개</p>
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{p.bio}</p>
              </div>
            </>
          )}
        </div>

        {/* 연락처 — 확정 인력에게만 공개 */}
        {isConfirmed && (
          <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <Phone className="w-4 h-4 text-brand" />
              <p className="text-sm font-semibold text-gray-700">연락처 <span className="text-xs text-green-600 font-normal ml-1">· 확정 인력 공개</span></p>
            </div>
            {user.phone ? (
              <a
                href={`tel:${user.phone}`}
                className="flex items-center gap-3 px-4 py-3 rounded-xl bg-blue-50 hover:bg-blue-100 transition-colors"
              >
                <Phone className="w-4 h-4 text-brand" />
                <span className="text-sm font-semibold text-brand">{user.phone}</span>
              </a>
            ) : (
              <p className="text-sm text-gray-400">전화번호 미등록</p>
            )}
            {user.email && (
              <div className="flex items-center gap-3 px-4 py-2">
                <Mail className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-600">{user.email}</span>
              </div>
            )}
          </div>
        )}

        {/* 업무 분야 */}
        {p.workFields.length > 0 && (
          <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6 space-y-3">
            <div className="flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-gray-400" />
              <p className="text-sm font-semibold text-gray-700">업무 분야</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {p.workFields.map((f) => (
                <span key={f} className="px-3 py-1 rounded-full bg-blue-50 text-brand text-xs font-medium">
                  {WORK_FIELD_LABELS[f as keyof typeof WORK_FIELD_LABELS] ?? f}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 인증 자격증 */}
        {p.credentials.length > 0 && (
          <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6 space-y-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-green-500" />
              <p className="text-sm font-semibold text-gray-700">인증 자격증</p>
            </div>
            <div className="space-y-2">
              {p.credentials.map((cred) => (
                <div key={cred.type} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <span className="text-sm font-medium text-gray-800">
                    {CREDENTIAL_LABELS[cred.type as keyof typeof CREDENTIAL_LABELS] ?? cred.type}
                  </span>
                  <span className="text-xs text-green-600 font-medium">인증 완료</span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
