import { redirect } from "next/navigation"
import Link from "next/link"
import { CheckCircle2, Clock, XCircle, Building2, Mail } from "lucide-react"
import { getServerSession } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { COMPANY_PENDING, COMPANY_STATUS_LABELS } from "@/lib/constants"

export default async function PendingPage() {
  const session = await getServerSession()
  if (!session?.user?.id) redirect("/login")

  const company = await prisma.company.findUnique({
    where: { ownerId: session.user.id },
    select: { status: true, name: true, licenseNumber: true, createdAt: true },
  })

  if (!company) redirect("/register")
  if (company.status === "APPROVED") redirect("/")

  const isRejected = company.status === "REJECTED"
  const statusLabel = COMPANY_STATUS_LABELS[company.status] ?? company.status

  const TIMELINE_STEPS = [
    {
      icon: CheckCircle2,
      label: "등록 완료",
      desc: "업체 등록 신청이 접수되었습니다.",
      done: true,
      current: false,
    },
    {
      icon: Clock,
      label: "관리자 검토 중",
      desc: "담당자가 제출하신 정보를 검토하고 있습니다.",
      done: false,
      current: !isRejected,
    },
    {
      icon: isRejected ? XCircle : CheckCircle2,
      label: isRejected ? "반려됨" : "승인 완료",
      desc: isRejected
        ? "등록 신청이 반려되었습니다."
        : "서비스 이용이 가능합니다.",
      done: isRejected,
      current: false,
    },
  ]

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md space-y-6">

        {/* 타임라인 카드 */}
        <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-8">
          <h1 className="text-xl font-bold text-gray-900 mb-6">{COMPANY_PENDING.PAGE_TITLE}</h1>

          {/* 타임라인 */}
          <div className="space-y-0">
            {TIMELINE_STEPS.map((step, i) => {
              const Icon = step.icon
              const isLast = i === TIMELINE_STEPS.length - 1

              let iconBg = "bg-gray-100"
              let iconColor = "text-gray-400"
              let labelColor = "text-gray-400"

              if (step.done && isRejected && isLast) {
                iconBg = "bg-red-50"
                iconColor = "text-sos"
                labelColor = "text-sos"
              } else if (step.done) {
                iconBg = "bg-green-50"
                iconColor = "text-green-600"
                labelColor = "text-gray-900"
              } else if (step.current) {
                iconBg = "bg-blue-50"
                iconColor = "text-brand"
                labelColor = "text-brand"
              }

              return (
                <div key={step.label} className="flex gap-4">
                  {/* 아이콘 + 연결선 */}
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${iconBg}
                        ${step.current ? "ring-2 ring-brand ring-offset-2 animate-pulse" : ""}`}
                    >
                      <Icon className={`w-4.5 h-4.5 ${iconColor}`} />
                    </div>
                    {!isLast && (
                      <div className={`w-px flex-1 my-1 ${step.done ? "bg-green-200" : "bg-gray-200"}`} style={{ minHeight: "2rem" }} />
                    )}
                  </div>

                  {/* 텍스트 */}
                  <div className="pb-6">
                    <p className={`text-sm font-semibold ${labelColor}`}>{step.label}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{step.desc}</p>
                  </div>
                </div>
              )
            })}
          </div>

          {/* 반려 사유 (있는 경우) */}
          {isRejected && (
            <div className="mt-2 p-4 bg-red-50 border border-red-100 rounded-xl">
              <p className="text-sm text-sos font-medium">{COMPANY_PENDING.REJECTED_NOTICE}</p>
            </div>
          )}
        </div>

        {/* 업체 정보 카드 */}
        <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6 space-y-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">등록 정보</p>
          <div className="space-y-2 text-sm text-gray-700">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-gray-400 shrink-0" />
              <span className="text-gray-500">업체명</span>
              <span className="font-medium ml-auto">{company.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 shrink-0" />
              <span className="text-gray-500">허가번호</span>
              <span className="font-medium ml-auto">{company.licenseNumber}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 shrink-0" />
              <span className="text-gray-500">신청일</span>
              <span className="font-medium ml-auto">
                {new Date(company.createdAt).toLocaleDateString("ko-KR", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
            </div>
          </div>
        </div>

        {/* 하단 액션 */}
        <div className="flex flex-col gap-3">
          {isRejected ? (
            <Link
              href="/register"
              className="w-full h-12 flex items-center justify-center bg-sos text-white
                         font-semibold rounded-xl hover:bg-red-700 transition-colors"
            >
              재신청하기
            </Link>
          ) : null}
          <a
            href="mailto:support@guardon.kr"
            className="w-full h-11 flex items-center justify-center gap-2
                       border border-gray-200 rounded-xl text-sm text-gray-600
                       hover:bg-gray-50 transition-colors"
          >
            <Mail className="w-4 h-4" />
            문의하기
          </a>
        </div>
      </div>
    </div>
  )
}
