import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "@/lib/session"
import { UserRole, Prisma } from "@prisma/client"
import { PageHeader } from "@/components/ui/page-header"
import PointChargeForm from "./PointChargeForm"
import { Receipt } from "lucide-react"

interface ReceiptInfo {
  type: "CASH_RECEIPT" | "TAX_INVOICE"
  purpose?: "INCOME" | "EXPENSE"
  number?: string
  businessNumber?: string
  companyName?: string
  ceoName?: string
  email?: string
}

export default async function AdminPointsPage() {
  const session = await getServerSession()
  if (!session?.user?.id) redirect("/login")
  if (session.user.role !== UserRole.ADMIN) redirect("/")

  const users = await prisma.user.findMany({
    where: {
      role: { in: [UserRole.COMPANY_OWNER, UserRole.WORKER] },
      deletedAt: null,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      phone: true,
      pointAccount: { select: { balance: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  // 업체 대표의 충전 내역 중 영수증 정보가 있는 것
  const chargeReceipts = await prisma.pointTransaction.findMany({
    where: {
      type: "SELF_CHARGE",
      receiptInfo: { not: Prisma.JsonNull },
      account: {
        user: { role: UserRole.COMPANY_OWNER },
      },
    },
    include: {
      account: {
        include: { user: { select: { id: true, name: true, email: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  })

  return (
    <div className="space-y-8 pb-10">
      <PageHeader title="포인트 관리" subtitle="유저에게 포인트를 충전합니다." />
      <PointChargeForm users={users} />

      {/* 업체 대표 충전 영수증 발행 내역 */}
      {chargeReceipts.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-amber-600" />
            <h2 className="text-sm font-semibold text-gray-700">충전 지출 영수증 발행 내역 (관리자 전용)</h2>
          </div>
          <div className="space-y-3">
            {chargeReceipts.map((tx) => {
              const info = tx.receiptInfo as unknown as ReceiptInfo
              return (
                <div key={tx.id} className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{(tx as any).account?.user?.name ?? (tx as any).account?.user?.email}</p>
                      <p className="text-xs text-gray-500">{(tx as any).account?.user?.email}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-amber-700">{tx.amount.toLocaleString()}P 충전</p>
                      <p className="text-xs text-gray-400">
                        {tx.createdAt.toLocaleString("ko-KR", {
                          year: "numeric", month: "2-digit", day: "2-digit",
                          hour: "2-digit", minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="border-t border-amber-200 pt-2 text-xs space-y-1">
                    {info.type === "CASH_RECEIPT" ? (
                      <>
                        <div className="flex gap-2">
                          <span className="text-gray-400 w-24 shrink-0">발행 유형</span>
                          <span className="text-gray-700 font-medium">현금영수증 ({info.purpose === "INCOME" ? "소득공제용" : "지출증빙용"})</span>
                        </div>
                        <div className="flex gap-2">
                          <span className="text-gray-400 w-24 shrink-0">{info.purpose === "INCOME" ? "휴대폰번호" : "사업자번호"}</span>
                          <span className="text-gray-700 font-medium">{info.number ?? "-"}</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex gap-2">
                          <span className="text-gray-400 w-24 shrink-0">발행 유형</span>
                          <span className="text-gray-700 font-medium">세금계산서</span>
                        </div>
                        <div className="flex gap-2">
                          <span className="text-gray-400 w-24 shrink-0">사업자등록번호</span>
                          <span className="text-gray-700 font-medium">{info.businessNumber ?? "-"}</span>
                        </div>
                        <div className="flex gap-2">
                          <span className="text-gray-400 w-24 shrink-0">상호</span>
                          <span className="text-gray-700 font-medium">{info.companyName ?? "-"}</span>
                        </div>
                        <div className="flex gap-2">
                          <span className="text-gray-400 w-24 shrink-0">대표자명</span>
                          <span className="text-gray-700 font-medium">{info.ceoName ?? "-"}</span>
                        </div>
                        <div className="flex gap-2">
                          <span className="text-gray-400 w-24 shrink-0">이메일</span>
                          <span className="text-gray-700 font-medium">{info.email ?? "-"}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
