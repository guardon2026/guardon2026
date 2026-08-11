import { redirect } from "next/navigation"
import { Wallet, FileText } from "lucide-react"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "@/lib/session"
import { UserRole } from "@prisma/client"
import { PageHeader } from "@/components/ui/page-header"
import { StatusBadge } from "@/components/ui/status-badge"
import { calcDailyTax, calcInsuredDailyTax } from "@/lib/tax"
import PaidCheckbox from "./PaidCheckbox"

const URGENCY_FEE: Record<string, number> = { NORMAL: 0, FAST: 5_000, URGENT: 10_000, CRITICAL: 15_000 }

interface Row {
  id: string
  workerName: string
  sosTitle: string
  scheduleDate: string
  insuranceStatus: "DAILY_WORKER" | "INSURED"
  netPay: number
  paidAt: Date | null
}

function InsuranceBadge({ status }: { status: "DAILY_WORKER" | "INSURED" }) {
  return status === "INSURED"
    ? <StatusBadge variant="pending" label="4대보험 대상" />
    : <StatusBadge variant="unresolved" label="일용직" />
}

function PayrollGroup({ title, rows }: { title: string; rows: Row[] }) {
  if (rows.length === 0) return null
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-gray-500">{title} ({rows.length}명)</p>
      <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50 overflow-hidden">
        {rows.map((r) => (
          <div key={r.id} className="flex items-center justify-between gap-4 px-6 py-4">
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-gray-900 truncate">{r.workerName}</p>
                <InsuranceBadge status={r.insuranceStatus} />
              </div>
              <p className="text-xs text-gray-400 truncate">{r.sosTitle} · {r.scheduleDate}</p>
            </div>
            <div className="flex items-center gap-4 shrink-0">
              <p className="text-sm font-bold text-gray-900">{r.netPay.toLocaleString()}원</p>
              <PaidCheckbox matchId={r.id} initialPaid={!!r.paidAt} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default async function PayrollPage() {
  const session = await getServerSession()
  if (!session?.user?.id) redirect("/login")
  if (session.user.role !== UserRole.COMPANY_OWNER) redirect("/")

  const company = await prisma.company.findUnique({
    where: { ownerId: session.user.id },
    select: { id: true },
  })
  if (!company) redirect("/register")

  const matches = await prisma.sosMatch.findMany({
    where: { sosRequest: { companyId: company.id }, missionConfirmedAt: { not: null } },
    include: {
      sosRequest: { select: { id: true, title: true, hourlyRate: true, urgencyLevel: true } },
      workerProfile: { include: { user: { select: { name: true } } } },
    },
    orderBy: { missionConfirmedAt: "desc" },
  })

  const rows: Row[] = matches.map((m) => {
    const urgencyBonus = URGENCY_FEE[m.sosRequest.urgencyLevel] ?? 0
    const effectiveDailyRate = m.sosRequest.hourlyRate + urgencyBonus
    const netPay = m.insuranceStatus === "INSURED"
      ? calcInsuredDailyTax(effectiveDailyRate).netPay
      : calcDailyTax(effectiveDailyRate).netPay
    return {
      id: m.id,
      workerName: m.workerProfile.user.name ?? "경비 인력",
      sosTitle: m.sosRequest.title,
      scheduleDate: m.scheduleDate,
      insuranceStatus: m.insuranceStatus,
      netPay,
      paidAt: m.paidAt,
    }
  })

  const unpaid = rows.filter((r) => !r.paidAt)
  const paid = rows.filter((r) => r.paidAt)

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <PageHeader
        title="인건비 정산"
        subtitle="SOS 완료 인력의 지급 현황"
        action={
          <div className="text-xs text-gray-400">
            지급대기 {unpaid.length}명 · 지급완료 {paid.length}명
          </div>
        }
      />

      {rows.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center space-y-3">
          <Wallet className="w-8 h-8 text-gray-300 mx-auto" />
          <p className="text-sm font-medium text-gray-500">정산할 내역이 없습니다</p>
          <p className="text-xs text-gray-400">임무 완료가 확정된 인력이 생기면 여기에 표시됩니다.</p>
        </div>
      ) : (
        <>
          <div className="space-y-5">
            <h2 className="text-sm font-bold text-gray-900">지급 대기</h2>
            {unpaid.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">지급 대기 중인 인력이 없습니다.</p>
            ) : (
              <>
                <PayrollGroup title="일용직" rows={unpaid.filter((r) => r.insuranceStatus === "DAILY_WORKER")} />
                <PayrollGroup title="4대보험 대상" rows={unpaid.filter((r) => r.insuranceStatus === "INSURED")} />
              </>
            )}
          </div>

          <div className="space-y-5">
            <h2 className="text-sm font-bold text-gray-900">지급 완료</h2>
            {paid.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">지급 완료된 인력이 없습니다.</p>
            ) : (
              <>
                <PayrollGroup title="일용직" rows={paid.filter((r) => r.insuranceStatus === "DAILY_WORKER")} />
                <PayrollGroup title="4대보험 대상" rows={paid.filter((r) => r.insuranceStatus === "INSURED")} />
              </>
            )}
          </div>
        </>
      )}

      <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 text-xs text-amber-700 space-y-1 flex items-start gap-2">
        <FileText className="w-3.5 h-3.5 shrink-0 mt-0.5" />
        <p>인건비는 임무 확정일로부터 14일 이내에 경비 인력에게 직접 계좌이체로 지급해 주세요. 지급 완료 체크는 업체 내부 기록용이며, 실제 지급은 플랫폼 밖에서 이루어집니다.</p>
      </div>
    </div>
  )
}
