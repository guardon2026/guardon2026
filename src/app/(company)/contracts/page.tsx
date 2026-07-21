import { redirect } from "next/navigation"
import Link from "next/link"
import { FileText, ChevronRight, CheckCircle2, Clock } from "lucide-react"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "@/lib/session"
import { UserRole } from "@prisma/client"
import { PageHeader } from "@/components/ui/page-header"

export default async function ContractsPage() {
  const session = await getServerSession()
  if (!session?.user?.id) redirect("/login")
  if (session.user.role !== UserRole.COMPANY_OWNER) redirect("/")

  const company = await prisma.company.findUnique({
    where: { ownerId: session.user.id },
    select: { id: true },
  })
  if (!company) redirect("/register")

  const matches = await prisma.sosMatch.findMany({
    where: {
      sosRequest: { companyId: company.id },
      status: "CONFIRMED",
    },
    include: {
      sosRequest: { select: { id: true, title: true, scheduledAt: true } },
      workerProfile: { include: { user: { select: { name: true } } } },
      workContract: { select: { employerSignedAt: true, workerSignedAt: true } },
    },
    orderBy: { confirmedAt: "desc" },
  })

  const total      = matches.length
  const bothSigned = matches.filter((m) => m.workContract?.employerSignedAt && m.workContract?.workerSignedAt).length
  const pending    = total - bothSigned

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <PageHeader
        title="근로계약서"
        subtitle="확정된 매칭 인력의 일용직 근로계약서"
        action={
          <div className="flex items-center gap-3 text-xs">
            <span className="text-green-600 font-medium">✅ 완료 {bothSigned}건</span>
            {pending > 0 && <span className="text-amber-600 font-medium">⏳ 미완료 {pending}건</span>}
          </div>
        }
      />

      {matches.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center space-y-3">
          <FileText className="w-8 h-8 text-gray-300 mx-auto" />
          <p className="text-sm font-medium text-gray-500">작성할 계약서가 없습니다</p>
          <p className="text-xs text-gray-400">SOS 매칭이 확정되면 여기에 계약서가 표시됩니다.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50 overflow-hidden">
          {matches.map((m) => {
            const empSigned = !!m.workContract?.employerSignedAt
            const wrkSigned = !!m.workContract?.workerSignedAt
            const both      = empSigned && wrkSigned
            const workerName = m.workerProfile.user.name ?? "경비 인력"
            const scheduledDate = new Date(m.sosRequest.scheduledAt).toLocaleDateString("ko-KR", {
              month: "long", day: "numeric",
            })

            return (
              <Link
                key={m.id}
                href={`/sos/${m.sosRequest.id}/contract/${m.id}`}
                className="flex items-center justify-between gap-4 px-6 py-4 hover:bg-gray-50 transition-colors group"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${both ? "bg-green-50" : "bg-amber-50"}`}>
                    {both
                      ? <CheckCircle2 className="w-4 h-4 text-green-500" />
                      : <Clock className="w-4 h-4 text-amber-500" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{workerName}</p>
                    <p className="text-xs text-gray-400 mt-0.5 truncate">
                      {m.sosRequest.title} · {scheduledDate}
                    </p>
                    <p className={`text-xs mt-0.5 font-medium ${both ? "text-green-600" : empSigned ? "text-blue-600" : "text-amber-600"}`}>
                      {both
                        ? "양측 서명 완료"
                        : empSigned
                        ? "사업주 서명 완료 · 근로자 대기 중"
                        : wrkSigned
                        ? "근로자 서명 완료 · 사업주 서명 필요"
                        : "미작성"}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors shrink-0" />
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
