import { redirect } from "next/navigation"
import Link from "next/link"
import { ClipboardList, ChevronRight, FileText } from "lucide-react"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "@/lib/session"
import { UserRole } from "@prisma/client"
import { PageHeader } from "@/components/ui/page-header"

export default async function TaxReportsPage() {
  const session = await getServerSession()
  if (!session?.user?.id) redirect("/login")
  if (session.user.role !== UserRole.COMPANY_OWNER) redirect("/")

  const company = await prisma.company.findUnique({
    where: { ownerId: session.user.id },
    select: { id: true },
  })
  if (!company) redirect("/register")

  // 확정된 인력이 1명 이상인 SOS 요청만 표시
  const sosRequests = await prisma.sosRequest.findMany({
    where: {
      companyId: company.id,
      sosMatches: { some: { status: "CONFIRMED" } },
    },
    select: {
      id: true,
      title: true,
      status: true,
      scheduledAt: true,
      hourlyRate: true,
      urgencyLevel: true,
      _count: { select: { sosMatches: { where: { status: "CONFIRMED" } } } },
    },
    orderBy: { scheduledAt: "desc" },
  })

  const STATUS_LABELS: Record<string, string> = {
    DISPATCHING: "배치 중",
    PENDING: "대기",
    CONFIRMED: "확정",
    COMPLETED: "완료",
    UNRESOLVED: "미해결",
    CANCELLED: "취소",
  }

  const STATUS_COLORS: Record<string, string> = {
    COMPLETED: "text-green-700 bg-green-50",
    CONFIRMED: "text-blue-700 bg-blue-50",
    DISPATCHING: "text-amber-700 bg-amber-50",
    CANCELLED: "text-gray-500 bg-gray-100",
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <PageHeader
        title="신고 정보"
        subtitle="원천징수 및 일용직 노무 신고 자료"
        action={
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <ClipboardList className="w-3.5 h-3.5" />
            확정 인력이 있는 SOS 요청
          </div>
        }
      />

      {sosRequests.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center space-y-3">
          <FileText className="w-8 h-8 text-gray-300 mx-auto" />
          <p className="text-sm font-medium text-gray-500">신고할 내역이 없습니다</p>
          <p className="text-xs text-gray-400">확정된 인력이 있는 SOS 요청이 생기면 여기에 표시됩니다.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50 overflow-hidden">
          {sosRequests.map((sos) => {
            const confirmedCount = sos._count.sosMatches
            const statusLabel = STATUS_LABELS[sos.status] ?? sos.status
            const statusColor = STATUS_COLORS[sos.status] ?? "text-gray-500 bg-gray-100"
            const scheduledDate = new Date(sos.scheduledAt).toLocaleDateString("ko-KR", {
              year: "numeric", month: "long", day: "numeric",
            })

            return (
              <Link
                key={sos.id}
                href={`/sos/${sos.id}/tax-report`}
                className="flex items-center justify-between gap-4 px-6 py-4 hover:bg-gray-50 transition-colors group"
              >
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-900 truncate">{sos.title}</p>
                    <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${statusColor}`}>
                      {statusLabel}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">
                    {scheduledDate} · 확정 인력 {confirmedCount}명 · 일급 {sos.hourlyRate.toLocaleString()}원
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors shrink-0" />
              </Link>
            )
          })}
        </div>
      )}

      <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 text-xs text-amber-700 space-y-1">
        <p className="font-semibold">신고 기한 안내</p>
        <p>· 원천징수 지급명세서: 지급월 다음 달 말일까지 홈택스 제출</p>
        <p>· 고용보험 취득신고: 근로 개시일로부터 14일 이내 근로복지공단 제출</p>
      </div>
    </div>
  )
}
