import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "@/lib/session"
import { UserRole } from "@prisma/client"
import { PageHeader } from "@/components/ui/page-header"
import { Coins, TrendingDown, ArrowDownCircle } from "lucide-react"
import ChargeButton from "./ChargeButton"
import WithdrawButton from "./WithdrawButton"

function relativeTime(date: Date): string {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000)
  if (diff < 60) return "방금 전"
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`
  return `${Math.floor(diff / 86400)}일 전`
}

function txTypeLabel(type: string) {
  switch (type) {
    case "ADMIN_CHARGE": return "관리자 충전"
    case "SELF_CHARGE":  return "포인트 충전"
    case "SOS_DEDUCT":          return "SOS 요청 차감"
    case "REFUND":              return "환불"
    case "WITHDRAWAL":          return "출금 신청"
    case "CANCEL_COMPENSATION": return "취소 수수료 수취"
    default:                    return type
  }
}

export default async function CompanyPointsPage() {
  const session = await getServerSession()
  if (!session?.user?.id) redirect("/login")
  if (session.user.role !== UserRole.COMPANY_OWNER) redirect("/")

  const account = await prisma.pointAccount.findUnique({
    where: { userId: session.user.id },
    include: {
      transactions: { orderBy: { createdAt: "desc" }, take: 100 },
    },
  })

  const balance = account?.balance ?? 0
  const transactions = account?.transactions ?? []
  const totalDeducted = transactions
    .filter((t) => t.amount < 0)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0)

  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-center justify-between">
        <PageHeader title="포인트 내역" />
        <div className="flex items-center gap-2">
          <WithdrawButton balance={balance} />
          <ChargeButton />
        </div>
      </div>

      {/* 잔액 카드 */}
      <div className="bg-gradient-to-br from-brand to-blue-700 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-center gap-2 mb-1 opacity-80 text-sm font-medium">
          <Coins className="w-4 h-4" />
          보유 포인트
        </div>
        <p className="text-4xl font-extrabold tracking-tight">
          {balance.toLocaleString()}<span className="text-2xl ml-1 font-semibold opacity-80">P</span>
        </p>
        <p className="mt-3 text-xs opacity-70">
          SOS 요청 시 일급 × 필요 인원만큼 차감됩니다.
        </p>
      </div>

      {/* 통계 */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-1">
            <TrendingDown className="w-3.5 h-3.5" />
            총 차감
          </div>
          <p className="text-xl font-bold text-gray-900">{totalDeducted.toLocaleString()}<span className="text-sm text-gray-400 ml-0.5">P</span></p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-1">
            <ArrowDownCircle className="w-3.5 h-3.5" />
            총 거래 횟수
          </div>
          <p className="text-xl font-bold text-gray-900">{transactions.length}<span className="text-sm text-gray-400 ml-0.5">건</span></p>
        </div>
      </div>

      {/* 거래 내역 */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">거래 내역</p>
        {transactions.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-sm text-gray-400">
            거래 내역이 없습니다.
          </div>
        ) : (
          <div className="space-y-2">
            {transactions.map((tx) => (
              <div
                key={tx.id}
                className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{tx.description}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {txTypeLabel(tx.type)} · {relativeTime(new Date(tx.createdAt))}
                  </p>
                </div>
                <p className={`text-sm font-bold shrink-0 ${tx.amount >= 0 ? "text-blue-600" : "text-red-500"}`}>
                  {tx.amount >= 0 ? "+" : ""}{tx.amount.toLocaleString()}P
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
