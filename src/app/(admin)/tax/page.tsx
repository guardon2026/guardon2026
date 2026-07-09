import { prisma } from "@/lib/prisma"
import { getServerSession } from "@/lib/session"
import { redirect } from "next/navigation"
import { UserRole } from "@prisma/client"
import { PageHeader } from "@/components/ui/page-header"
import TaxTabs from "./TaxTabs"

interface CashReceiptInfo {
  type: "CASH_RECEIPT"
  purpose: "INCOME" | "EXPENSE"
  number: string
}

interface TaxInvoiceInfo {
  type: "TAX_INVOICE"
  businessNumber: string
  companyName: string
  ceoName: string
  email: string
}

export default async function TaxPage() {
  const session = await getServerSession()
  if (!session || session.user.role !== UserRole.ADMIN) redirect("/login")

  // 현금영수증 / 세금계산서 대상: 업체 대표 SELF_CHARGE 중 receiptInfo 있는 것
  const chargeWithReceipt = await prisma.pointTransaction.findMany({
    where: {
      type: "SELF_CHARGE",
      receiptInfo: { not: null },
      account: { user: { role: UserRole.COMPANY_OWNER } },
    },
    include: {
      account: {
        include: { user: { select: { id: true, name: true, email: true, phone: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  // 세금신고(원천징수): 경비 인력 WITHDRAWAL 중 description에 실명 포함된 것
  const withdrawalWithTax = await prisma.pointTransaction.findMany({
    where: {
      type: "WITHDRAWAL",
      description: { contains: "실명:" },
      account: { user: { role: UserRole.WORKER } },
    },
    include: {
      account: {
        include: { user: { select: { id: true, name: true, email: true, phone: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  const cashReceipts = chargeWithReceipt.filter(
    (tx) => (tx.receiptInfo as { type: string } | null)?.type === "CASH_RECEIPT"
  )
  const taxInvoices = chargeWithReceipt.filter(
    (tx) => (tx.receiptInfo as { type: string } | null)?.type === "TAX_INVOICE"
  )

  // description에서 세금신고 정보 파싱
  function parseTaxInfo(desc: string) {
    const nameMatch = desc.match(/실명:\s*([^\s/]+)/)
    const rnMatch = desc.match(/주민번호:\s*(\S+)/)
    const bankMatch = desc.match(/출금 신청:\s*([^\s]+)\s+([^\s]+)\s+\(([^)]+)\)/)
    return {
      realName: nameMatch?.[1] ?? "-",
      residentNumber: rnMatch?.[1] ?? "-",
      bankName: bankMatch?.[1] ?? "-",
      accountNumber: bankMatch?.[2] ?? "-",
      accountHolder: bankMatch?.[3] ?? "-",
    }
  }

  const cashReceiptData = cashReceipts.map((tx) => ({
    id: tx.id,
    amount: tx.amount,
    createdAt: tx.createdAt.toISOString(),
    user: tx.account.user,
    receipt: tx.receiptInfo as CashReceiptInfo,
    taxCompleted: tx.taxCompleted,
  }))

  const taxInvoiceData = taxInvoices.map((tx) => ({
    id: tx.id,
    amount: tx.amount,
    createdAt: tx.createdAt.toISOString(),
    user: tx.account.user,
    receipt: tx.receiptInfo as TaxInvoiceInfo,
    taxCompleted: tx.taxCompleted,
  }))

  const withdrawalData = withdrawalWithTax.map((tx) => ({
    id: tx.id,
    amount: Math.abs(tx.amount),
    createdAt: tx.createdAt.toISOString(),
    user: tx.account.user,
    taxCompleted: tx.taxCompleted,
    ...parseTaxInfo(tx.description),
  }))

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        title="세금 신고 관리"
        subtitle="현금영수증 · 세금계산서 · 원천징수 신고 대상 목록"
      />
      <TaxTabs
        cashReceipts={cashReceiptData}
        taxInvoices={taxInvoiceData}
        withdrawals={withdrawalData}
      />
    </div>
  )
}
