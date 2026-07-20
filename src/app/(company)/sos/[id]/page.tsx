import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Calendar, Clock, FileText, MapPin, Phone, ShieldCheck, Users, Zap } from "lucide-react"
import { SosApplicationStatus, SosUrgency, UserRole } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "@/lib/session"
import { PageHeader } from "@/components/ui/page-header"
import { StatusBadge } from "@/components/ui/status-badge"
import { SOS_STATUS_LABELS, WORK_FIELD_LABELS, CREDENTIAL_LABELS } from "@/lib/constants"
import type { StatusVariant } from "@/components/ui/status-badge"
import SosApplicationForm from "./SosApplicationForm"
import ApplicationStatusButton from "./ApplicationStatusButton"
import CancelButton from "./CancelButton"
import ConfirmButton from "./ConfirmButton"

interface SosDetailPageProps {
  params: Promise<{ id: string }>
}

const URGENCY_LABELS: Record<SosUrgency, string> = {
  CRITICAL: "즉시 투입",
  URGENT: "긴급",
  FAST: "빠른 모집",
  NORMAL: "일반",
}

const APPLICATION_STATUS_LABELS: Record<SosApplicationStatus, string> = {
  NEW: "신규",
  REVIEWING: "검토 중",
  CONTACTED: "연락 완료",
  SELECTED: "선정",
  REJECTED: "반려",
  CANCELLED: "취소",
  REPORTED: "신고",
}

function sosStatusVariant(status: string): StatusVariant {
  switch (status) {
    case "DISPATCHING": return "active"
    case "PENDING":     return "pending"
    case "CONFIRMED":   return "confirmed"
    case "UNRESOLVED":  return "unresolved"
    case "CANCELLED":   return "rejected"
    case "COMPLETED":   return "approved"
    default:            return "unresolved"
  }
}

function urgencyVariant(urgency: SosUrgency): StatusVariant {
  if (urgency === "CRITICAL") return "sos"
  if (urgency === "URGENT") return "rejected"
  if (urgency === "FAST") return "pending"
  return "unresolved"
}

function applicationVariant(status: SosApplicationStatus): StatusVariant {
  switch (status) {
    case "SELECTED": return "approved"
    case "CONTACTED": return "confirmed"
    case "REJECTED":
    case "CANCELLED":
    case "REPORTED":
      return "rejected"
    case "REVIEWING":
      return "pending"
    default:
      return "active"
  }
}

function formatDateTime(date: Date | null | undefined) {
  if (!date) return "미정"
  return new Date(date).toLocaleString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function InfoItem({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
}) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
      <div>
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-sm font-medium text-gray-900 mt-0.5 whitespace-pre-line">{value}</p>
      </div>
    </div>
  )
}

export default async function SosDetailPage({ params }: SosDetailPageProps) {
  const { id } = await params
  const session = await getServerSession()
  if (!session?.user?.id || !session.user.role) redirect("/login")
  if (session.user.role !== UserRole.COMPANY_OWNER && session.user.role !== UserRole.WORKER) redirect("/")

  const [viewerCompany, viewerWorker] = await Promise.all([
    session.user.role === UserRole.COMPANY_OWNER
      ? prisma.company.findUnique({
          where: { ownerId: session.user.id },
          select: { id: true, status: true, isActive: true, name: true, phone: true, owner: { select: { name: true, email: true, phone: true } } },
        })
      : Promise.resolve(null),
    session.user.role === UserRole.WORKER
      ? prisma.workerProfile.findUnique({
          where: { userId: session.user.id },
          select: { id: true, address: true, city: true, district: true, workFields: true, desiredHourlyRate: true, user: { select: { name: true, email: true, phone: true } } },
        })
      : Promise.resolve(null),
  ])

  if (session.user.role === UserRole.COMPANY_OWNER) {
    if (!viewerCompany) redirect("/register")
    if (viewerCompany.status !== "APPROVED" || !viewerCompany.isActive) redirect("/pending")
  }
  if (session.user.role === UserRole.WORKER) {
    if (!viewerWorker || !viewerWorker.address || !viewerWorker.city || !viewerWorker.district || viewerWorker.workFields.length === 0) {
      redirect("/profile/edit")
    }
  }

  const sosRequest = await prisma.sosRequest.findUnique({
    where: { id },
    include: {
      company: {
        include: {
          owner: { select: { id: true, name: true, phone: true, email: true } },
        },
      },
      sosApplications: {
        include: {
          applicantUser: { select: { id: true, name: true, phone: true, email: true } },
          company: { select: { id: true, name: true, phone: true, city: true, district: true, kakaoOpenChatUrl: true } },
          workerProfile: {
            select: {
              id: true,
              city: true,
              district: true,
              experienceYears: true,
              desiredHourlyRate: true,
              workFields: true,
              declaredCredentials: true,
              bio: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      },
      _count: { select: { sosApplications: true } },
    },
  })

  if (!sosRequest) notFound()

  const isOwner = viewerCompany?.id === sosRequest.companyId
  const myApplication = sosRequest.sosApplications.find((a) => a.applicantUserId === session.user.id) ?? null
  const canApply =
    !isOwner &&
    !myApplication &&
    !["CANCELLED", "COMPLETED", "UNRESOLVED"].includes(sosRequest.status) &&
    !sosRequest.closedAt &&
    (!sosRequest.applicationDeadline || sosRequest.applicationDeadline > new Date()) &&
    ((session.user.role === UserRole.COMPANY_OWNER && sosRequest.allowCompanyApplicants) ||
      (session.user.role === UserRole.WORKER && sosRequest.allowGuardApplicants))

  const canSeeOwnerContact =
    isOwner ||
    sosRequest.ownerContactVisible ||
    myApplication?.status === "SELECTED" ||
    myApplication?.status === "CONTACTED"

  if (!isOwner) {
    await prisma.sosRequest.update({
      where: { id: sosRequest.id },
      data: { viewCount: { increment: 1 } },
    })
  }

  // 예산 계산: 인건비(긴급도 포함) + 매칭 수수료 + 부가세
  const URGENCY_FEE_MAP: Record<string, number> = { NORMAL: 0, FAST: 5_000, URGENT: 10_000, CRITICAL: 15_000 }
  const urgencyBonus = URGENCY_FEE_MAP[sosRequest.urgencyLevel] ?? 0
  const scheduleDaysArr = Array.isArray(sosRequest.scheduleDays)
    ? (sosRequest.scheduleDays as Array<{ requiredCount?: number }>)
    : []
  const totalCount = scheduleDaysArr.length > 0
    ? scheduleDaysArr.reduce((s, d) => s + (d.requiredCount ?? 1), 0)
    : sosRequest.requiredCount
  const effectiveDailyRate = sosRequest.hourlyRate + urgencyBonus
  const laborCost = effectiveDailyRate * totalCount
  const serviceFee = Math.ceil(laborCost * 0.05)
  const vat = Math.ceil(serviceFee * 0.1)
  const totalBudget = laborCost + serviceFee + vat

  const [confirmedMatchCount, confirmedMatches] = await Promise.all([
    prisma.sosMatch.count({ where: { sosRequestId: id, status: "CONFIRMED" } }),
    isOwner
      ? prisma.sosMatch.findMany({
          where: { sosRequestId: id, status: "CONFIRMED" },
          include: {
            workerProfile: { include: { user: { select: { name: true, phone: true } } } },
            workContract: true,
          },
        })
      : Promise.resolve([]),
  ])

  const acceptedMatches = isOwner
    ? await prisma.sosMatch.findMany({
        where: { sosRequestId: id, status: "ACCEPTED" },
        include: {
          workerProfile: {
            include: {
              user: { select: { name: true, phone: true } },
              credentials: { select: { type: true, status: true } },
            },
          },
        },
        orderBy: { respondedAt: "asc" },
      })
    : []

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <PageHeader
        title={sosRequest.title}
        subtitle="GuardOn SOS 상세"
        action={
          <div className="flex items-center gap-2">
            <StatusBadge variant={urgencyVariant(sosRequest.urgencyLevel)} label={URGENCY_LABELS[sosRequest.urgencyLevel]} />
            <StatusBadge variant={sosStatusVariant(sosRequest.status)} label={SOS_STATUS_LABELS[sosRequest.status] ?? sosRequest.status} />
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        <div className="space-y-6">
          <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InfoItem icon={Calendar} label="배치 시작" value={formatDateTime(sosRequest.scheduledAt)} />
              <InfoItem icon={Clock} label="배치 종료" value={formatDateTime(sosRequest.scheduledEndAt)} />
              <InfoItem icon={MapPin} label="지역" value={sosRequest.region || [sosRequest.city, sosRequest.district].filter(Boolean).join(" ") || "협의"} />
              <InfoItem icon={Users} label="필요 인원" value={`${sosRequest.requiredCount}명`} />
              <InfoItem icon={Zap} label="예산" value={`${totalBudget.toLocaleString()}원 (인건비 ${laborCost.toLocaleString()}원 + 수수료 ${(serviceFee + vat).toLocaleString()}원)`} />
            </div>

            <div>
              <p className="text-xs text-gray-400 mb-1.5">업무 분야</p>
              <div className="flex flex-wrap gap-1.5">
                {sosRequest.requiredFields.map((f) => (
                  <span key={f} className="px-2.5 py-1 bg-blue-50 text-brand text-xs font-medium rounded-full">
                    {WORK_FIELD_LABELS[f] ?? f}
                  </span>
                ))}
              </div>
            </div>

            {sosRequest.requiredCredentials.length > 0 && (
              <div>
                <p className="text-xs text-gray-400 mb-1.5">필요 자격</p>
                <div className="flex flex-wrap gap-1.5">
                  {sosRequest.requiredCredentials.map((c) => (
                    <span key={c} className="px-2.5 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
                      {CREDENTIAL_LABELS[c] ?? c}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {sosRequest.description && (
              <div>
                <p className="text-xs text-gray-400 mb-1">상세 설명</p>
                <p className="text-sm text-gray-700 whitespace-pre-line">{sosRequest.description}</p>
              </div>
            )}

            {canSeeOwnerContact && sosRequest.siteManagerContact && (
              <div className="rounded-xl border border-green-100 bg-green-50 p-4">
                <p className="text-xs font-semibold text-green-700 mb-1 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5" />
                  현장 담당자 연락처
                </p>
                <p className="text-sm text-green-900 whitespace-pre-line">{sosRequest.siteManagerContact}</p>
              </div>
            )}
          </section>

          {isOwner && acceptedMatches.length > 0 && (
            <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
              <div>
                <h2 className="text-base font-bold text-gray-900">SOS 수락 인력 ({acceptedMatches.length}명)</h2>
                <p className="text-xs text-gray-500 mt-1">알림을 수락한 경비 인력입니다. 확정 버튼으로 최종 배치를 확정하세요.</p>
              </div>
              <div className="space-y-3">
                {acceptedMatches.map((m) => (
                  <div key={m.id} className="rounded-xl border border-green-100 bg-green-50 p-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{m.workerProfile.user.name ?? "경비 인력"}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {m.workerProfile.user.phone ?? "-"}
                        {m.workerProfile.credentials.filter(c => c.status === "APPROVED").length > 0 && (
                          <span className="ml-2 text-green-600">· 자격증 {m.workerProfile.credentials.filter(c => c.status === "APPROVED").length}개</span>
                        )}
                      </p>
                    </div>
                    <ConfirmButton
                      sosRequestId={sosRequest.id}
                      matchId={m.id}
                      workerName={m.workerProfile.user.name ?? undefined}
                    />
                  </div>
                ))}
              </div>
            </section>
          )}

          {isOwner && (
            <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-gray-900">신청자 관리</h2>
                  <p className="text-xs text-gray-500 mt-1">
                    공개 신청 {sosRequest._count.sosApplications}건, 확정 {confirmedMatchCount}명
                  </p>
                </div>
              </div>

              {sosRequest.sosApplications.length === 0 ? (
                <p className="text-sm text-gray-500 py-6 text-center">아직 접수된 신청이 없습니다.</p>
              ) : (
                <div className="space-y-3">
                  {sosRequest.sosApplications.map((app) => (
                    <div key={app.id} className="rounded-xl border border-gray-100 p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-gray-900">
                              {app.company?.name ?? app.applicantUser.name ?? "경호 인력"}
                            </p>
                            <StatusBadge variant={applicationVariant(app.status)} label={APPLICATION_STATUS_LABELS[app.status]} />
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            {app.applicantType === "COMPANY" ? "업체 신청" : "개인 경호 인력 신청"}
                            {app.availableHeadcount ? ` · ${app.availableHeadcount}명 투입 가능` : ""}
                            {app.proposedRate ? ` · 제안 ${app.proposedRate.toLocaleString()}원` : ""}
                          </p>
                        </div>
                        <div className="flex flex-wrap justify-end gap-1.5">
                          <ApplicationStatusButton applicationId={app.id} status="REVIEWING" />
                          <ApplicationStatusButton applicationId={app.id} status="CONTACTED" />
                          <ApplicationStatusButton applicationId={app.id} status="SELECTED" />
                          <ApplicationStatusButton applicationId={app.id} status="REJECTED" />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-gray-600">
                        <p>담당자: {app.contactName ?? app.applicantUser.name ?? "-"}</p>
                        <p>연락처: {app.contactPhone ?? app.company?.phone ?? app.applicantUser.phone ?? "-"}</p>
                        <p>이메일: {app.contactEmail ?? app.applicantUser.email ?? "-"}</p>
                      </div>
                      {app.workerProfile && (
                        <p className="text-xs text-gray-500">
                          지역 {app.workerProfile.city} {app.workerProfile.district} · 경력 {app.workerProfile.experienceYears}년
                        </p>
                      )}
                      {app.experienceSummary && <p className="text-sm text-gray-700 whitespace-pre-line">{app.experienceSummary}</p>}
                      {app.message && <p className="text-sm text-gray-700 whitespace-pre-line">{app.message}</p>}
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {isOwner && confirmedMatches.length > 0 && (
            <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
              <h2 className="text-base font-bold text-gray-900">확정된 매칭 인력 (계약서)</h2>
              <div className="space-y-3">
                {confirmedMatches.map((m) => {
                  const empSigned = !!m.workContract?.employerSignedAt
                  const wrkSigned = !!m.workContract?.workerSignedAt
                  const both = empSigned && wrkSigned
                  return (
                    <div key={m.id} className="rounded-xl border border-gray-100 p-4 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{m.workerProfile.user.name ?? "경비 인력"}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {both ? "✅ 양측 서명 완료" : empSigned ? "✍️ 사업주 서명 완료 · 근로자 대기" : wrkSigned ? "✍️ 근로자 서명 완료 · 사업주 대기" : "미작성"}
                        </p>
                      </div>
                      <Link
                        href={`/sos/${id}/contract/${m.id}`}
                        className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-brand text-white text-xs font-semibold hover:bg-blue-700 transition-colors"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        {empSigned ? "계약서 보기" : "계약서 작성"}
                      </Link>
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {!isOwner && myApplication && (
            <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-gray-900">내 신청 상태</p>
                  <p className="text-xs text-gray-500 mt-1">{formatDateTime(myApplication.createdAt)} 접수</p>
                </div>
                <StatusBadge variant={applicationVariant(myApplication.status)} label={APPLICATION_STATUS_LABELS[myApplication.status]} />
              </div>
              {myApplication.status !== "CANCELLED" && (
                <div className="mt-4">
                  <ApplicationStatusButton applicationId={myApplication.id} status="CANCELLED" />
                </div>
              )}
            </section>
          )}

          {canApply && (
            <SosApplicationForm
              sosRequestId={sosRequest.id}
              applicantType={session.user.role === UserRole.COMPANY_OWNER ? "COMPANY" : "GUARD"}
              defaultContactName={viewerCompany?.owner.name ?? viewerWorker?.user.name}
              defaultContactPhone={viewerCompany?.phone ?? viewerCompany?.owner.phone ?? viewerWorker?.user.phone}
              defaultContactEmail={viewerCompany?.owner.email ?? viewerWorker?.user.email}
            />
          )}
        </div>

        <aside className="space-y-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-3">
            <p className="text-sm font-bold text-gray-900">게시 업체</p>
            <p className="text-base font-semibold text-gray-900">{sosRequest.company.name}</p>
            <p className="text-sm text-gray-500">{sosRequest.company.city} {sosRequest.company.district}</p>
            {canSeeOwnerContact && (
              <div className="pt-3 border-t border-gray-100 text-sm text-gray-700 space-y-1">
                <p>대표/담당: {sosRequest.company.owner.name ?? "-"}</p>
                <p>전화: {sosRequest.company.phone || sosRequest.company.owner.phone || "-"}</p>
                <p>이메일: {sosRequest.company.owner.email ?? "-"}</p>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-2">
            <p className="text-sm font-bold text-gray-900">모집 현황</p>
            <p className="text-sm text-gray-600">신청 {sosRequest._count.sosApplications}건</p>
            <p className="text-sm text-gray-600">확정 인원 {confirmedMatchCount}명</p>
            <p className="text-sm text-gray-600">조회 {sosRequest.viewCount}회</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/sos"
              className="inline-flex items-center gap-1.5 h-10 px-4 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 hover:bg-gray-50"
            >
              <ArrowLeft className="w-4 h-4" />
              목록
            </Link>
            {isOwner && !["COMPLETED", "CANCELLED"].includes(sosRequest.status) && (
              <>
                <Link
                  href={`/sos/${sosRequest.id}/edit`}
                  className="inline-flex items-center h-10 px-4 rounded-lg border border-brand text-sm font-semibold text-brand hover:bg-blue-50"
                >
                  수정
                </Link>
                <CancelButton
                  sosRequestId={sosRequest.id}
                  confirmedCount={confirmedMatchCount}
                  hourlyRate={sosRequest.hourlyRate}
                />
              </>
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}
