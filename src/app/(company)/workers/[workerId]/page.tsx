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
import { Star, Briefcase, MapPin, ArrowLeft, ShieldCheck, User } from "lucide-react"

export default async function WorkerProfilePage({
  params,
}: {
  params: { workerId: string }
}) {
  const session = await getServerSession()
  if (!session?.user?.id) redirect("/login")
  if (session.user.role !== UserRole.COMPANY_OWNER) redirect("/unauthorized")

  const user = await prisma.user.findUnique({
    where: { id: params.workerId, deletedAt: null },
    select: {
      id: true,
      name: true,
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

  const p = user.workerProfile

  const availabilityLabel = AVAILABILITY_LABELS[p.availability as keyof typeof AVAILABILITY_LABELS] ?? p.availability
  const dotColor =
    p.availability === "AVAILABLE" ? "bg-green-500"
    : p.availability === "BUSY" ? "bg-amber-400"
    : "bg-gray-300"

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">

        <Link href="/search" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          인력 검색으로 돌아가기
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
