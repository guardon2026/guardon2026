"use client"

import { useState, useCallback } from "react"
import { Receipt, FileText, UserCheck, Copy, Check, CheckCircle2, Clock } from "lucide-react"

interface UserInfo {
  id: string
  name: string | null
  email: string | null
  phone: string | null
}

interface CashReceiptRow {
  id: string
  amount: number
  createdAt: string
  user: UserInfo
  taxCompleted: boolean
  receipt: {
    type: "CASH_RECEIPT"
    purpose: "INCOME" | "EXPENSE"
    number: string
  }
}

interface TaxInvoiceRow {
  id: string
  amount: number
  createdAt: string
  user: UserInfo
  taxCompleted: boolean
  receipt: {
    type: "TAX_INVOICE"
    businessNumber: string
    companyName: string
    ceoName: string
    email: string
  }
}

interface WithdrawalRow {
  id: string
  amount: number
  createdAt: string
  user: UserInfo
  taxCompleted: boolean
  realName: string
  residentNumber: string
  bankName: string
  accountNumber: string
  accountHolder: string
}

// ── 유틸 ────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("ko-KR", {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
  })
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }
  return (
    <button
      type="button"
      onClick={copy}
      className="ml-1.5 inline-flex items-center text-gray-400 hover:text-gray-600 transition-colors"
      title="복사"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  )
}

function StatusButton({
  id,
  completed,
  onToggle,
}: {
  id: string
  completed: boolean
  onToggle: (id: string, next: boolean) => void
}) {
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/tax/${id}`, { method: "PATCH" })
      if (res.ok) {
        const data = await res.json()
        onToggle(id, data.taxCompleted)
      }
    } finally {
      setLoading(false)
    }
  }

  if (completed) {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-green-100 text-green-700 hover:bg-green-200 transition-colors disabled:opacity-50"
      >
        <CheckCircle2 className="w-3.5 h-3.5" />
        {loading ? "처리 중..." : "발행 완료"}
      </button>
    )
  }
  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors disabled:opacity-50"
    >
      <Clock className="w-3.5 h-3.5" />
      {loading ? "처리 중..." : "발행 필요"}
    </button>
  )
}

function WithholdingButton({
  id,
  completed,
  onToggle,
}: {
  id: string
  completed: boolean
  onToggle: (id: string, next: boolean) => void
}) {
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/tax/${id}`, { method: "PATCH" })
      if (res.ok) {
        const data = await res.json()
        onToggle(id, data.taxCompleted)
      }
    } finally {
      setLoading(false)
    }
  }

  if (completed) {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-green-100 text-green-700 hover:bg-green-200 transition-colors disabled:opacity-50"
      >
        <CheckCircle2 className="w-3.5 h-3.5" />
        {loading ? "처리 중..." : "신고 완료"}
      </button>
    )
  }
  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-orange-100 text-orange-700 hover:bg-orange-200 transition-colors disabled:opacity-50"
    >
      <Clock className="w-3.5 h-3.5" />
      {loading ? "처리 중..." : "신고 필요"}
    </button>
  )
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="text-center py-16 text-gray-400 text-sm">{label} 내역이 없습니다.</div>
  )
}

// ── 현금영수증 탭 ────────────────────────────────────────────
function CashReceiptTab({
  rows,
  onToggle,
}: {
  rows: CashReceiptRow[]
  onToggle: (id: string, next: boolean) => void
}) {
  if (rows.length === 0) return <EmptyState label="현금영수증 발행" />
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-xs text-gray-500 font-semibold">
            <th className="text-left py-3 px-4">일시</th>
            <th className="text-left py-3 px-4">업체명 / 이메일</th>
            <th className="text-left py-3 px-4">용도</th>
            <th className="text-left py-3 px-4">번호</th>
            <th className="text-right py-3 px-4">충전금액</th>
            <th className="text-center py-3 px-4">상태</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((row) => (
            <tr key={row.id} className={`hover:bg-gray-50 transition-colors ${row.taxCompleted ? "opacity-60" : ""}`}>
              <td className="py-3 px-4 text-gray-500 whitespace-nowrap">{formatDate(row.createdAt)}</td>
              <td className="py-3 px-4">
                <p className="font-medium text-gray-900">{row.user.name ?? "-"}</p>
                <p className="text-xs text-gray-400">{row.user.email}</p>
              </td>
              <td className="py-3 px-4">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${row.receipt.purpose === "INCOME" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"}`}>
                  {row.receipt.purpose === "INCOME" ? "소득공제용" : "지출증빙용"}
                </span>
              </td>
              <td className="py-3 px-4 font-mono text-gray-800">
                {row.receipt.number}
                <CopyButton text={row.receipt.number} />
              </td>
              <td className="py-3 px-4 text-right font-semibold text-gray-900">
                {row.amount.toLocaleString()}원
              </td>
              <td className="py-3 px-4 text-center">
                <StatusButton id={row.id} completed={row.taxCompleted} onToggle={onToggle} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── 세금계산서 탭 ────────────────────────────────────────────
function TaxInvoiceTab({
  rows,
  onToggle,
}: {
  rows: TaxInvoiceRow[]
  onToggle: (id: string, next: boolean) => void
}) {
  if (rows.length === 0) return <EmptyState label="세금계산서 발행" />
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-xs text-gray-500 font-semibold">
            <th className="text-left py-3 px-4">일시</th>
            <th className="text-left py-3 px-4">업체명 / 이메일</th>
            <th className="text-left py-3 px-4">사업자등록번호</th>
            <th className="text-left py-3 px-4">상호 / 대표자</th>
            <th className="text-left py-3 px-4">발송 이메일</th>
            <th className="text-right py-3 px-4">공급가액</th>
            <th className="text-center py-3 px-4">상태</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((row) => (
            <tr key={row.id} className={`hover:bg-gray-50 transition-colors ${row.taxCompleted ? "opacity-60" : ""}`}>
              <td className="py-3 px-4 text-gray-500 whitespace-nowrap">{formatDate(row.createdAt)}</td>
              <td className="py-3 px-4">
                <p className="font-medium text-gray-900">{row.user.name ?? "-"}</p>
                <p className="text-xs text-gray-400">{row.user.email}</p>
              </td>
              <td className="py-3 px-4 font-mono text-gray-800">
                {row.receipt.businessNumber}
                <CopyButton text={row.receipt.businessNumber} />
              </td>
              <td className="py-3 px-4">
                <p className="font-medium text-gray-900">{row.receipt.companyName}</p>
                <p className="text-xs text-gray-500">{row.receipt.ceoName}</p>
              </td>
              <td className="py-3 px-4 text-gray-700">
                {row.receipt.email}
                <CopyButton text={row.receipt.email} />
              </td>
              <td className="py-3 px-4 text-right font-semibold text-gray-900">
                {row.amount.toLocaleString()}원
              </td>
              <td className="py-3 px-4 text-center">
                <StatusButton id={row.id} completed={row.taxCompleted} onToggle={onToggle} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── 원천징수 신고 탭 ─────────────────────────────────────────
function WithdrawalTab({
  rows,
  onToggle,
}: {
  rows: WithdrawalRow[]
  onToggle: (id: string, next: boolean) => void
}) {
  if (rows.length === 0) return <EmptyState label="원천징수 신고" />
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-xs text-gray-500 font-semibold">
            <th className="text-left py-3 px-4">일시</th>
            <th className="text-left py-3 px-4">경비 인력</th>
            <th className="text-left py-3 px-4">실명</th>
            <th className="text-left py-3 px-4">주민등록번호</th>
            <th className="text-left py-3 px-4">입금 계좌</th>
            <th className="text-right py-3 px-4">출금액</th>
            <th className="text-center py-3 px-4">상태</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((row) => (
            <tr key={row.id} className={`hover:bg-gray-50 transition-colors ${row.taxCompleted ? "opacity-60" : ""}`}>
              <td className="py-3 px-4 text-gray-500 whitespace-nowrap">{formatDate(row.createdAt)}</td>
              <td className="py-3 px-4">
                <p className="font-medium text-gray-900">{row.user.name ?? "-"}</p>
                <p className="text-xs text-gray-400">{row.user.email}</p>
              </td>
              <td className="py-3 px-4 font-medium text-gray-900">{row.realName}</td>
              <td className="py-3 px-4 font-mono text-gray-800">
                {row.residentNumber}
                <CopyButton text={row.residentNumber} />
              </td>
              <td className="py-3 px-4 text-gray-700">
                <p>{row.bankName} {row.accountNumber}</p>
                <p className="text-xs text-gray-400">예금주: {row.accountHolder}</p>
              </td>
              <td className="py-3 px-4 text-right font-semibold text-gray-900">
                {row.amount.toLocaleString()}원
              </td>
              <td className="py-3 px-4 text-center">
                <WithholdingButton id={row.id} completed={row.taxCompleted} onToggle={onToggle} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── 메인 탭 컴포넌트 ─────────────────────────────────────────
const TABS = [
  { key: "cash",        label: "현금영수증",    icon: Receipt   },
  { key: "invoice",     label: "세금계산서",    icon: FileText  },
  { key: "withholding", label: "원천징수 신고", icon: UserCheck },
] as const

type TabKey = typeof TABS[number]["key"]

export default function TaxTabs({
  cashReceipts: initialCash,
  taxInvoices: initialInvoice,
  withdrawals: initialWithdrawals,
}: {
  cashReceipts: CashReceiptRow[]
  taxInvoices: TaxInvoiceRow[]
  withdrawals: WithdrawalRow[]
}) {
  const [active, setActive] = useState<TabKey>("cash")
  const [cashRows, setCashRows] = useState(initialCash)
  const [invoiceRows, setInvoiceRows] = useState(initialInvoice)
  const [withdrawalRows, setWithdrawalRows] = useState(initialWithdrawals)

  const toggleCash = useCallback((id: string, next: boolean) => {
    setCashRows((prev) => prev.map((r) => r.id === id ? { ...r, taxCompleted: next } : r))
  }, [])
  const toggleInvoice = useCallback((id: string, next: boolean) => {
    setInvoiceRows((prev) => prev.map((r) => r.id === id ? { ...r, taxCompleted: next } : r))
  }, [])
  const toggleWithdrawal = useCallback((id: string, next: boolean) => {
    setWithdrawalRows((prev) => prev.map((r) => r.id === id ? { ...r, taxCompleted: next } : r))
  }, [])

  // 미완료 건수만 배지에 표시
  const pending: Record<TabKey, number> = {
    cash:        cashRows.filter((r) => !r.taxCompleted).length,
    invoice:     invoiceRows.filter((r) => !r.taxCompleted).length,
    withholding: withdrawalRows.filter((r) => !r.taxCompleted).length,
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* 탭 헤더 */}
      <div className="flex border-b border-gray-200">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setActive(key)}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-semibold transition-colors border-b-2 -mb-px ${
              active === key
                ? "border-brand text-brand"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
            {pending[key] > 0 && (
              <span className={`ml-1 px-1.5 py-0.5 rounded-full text-xs font-bold ${
                active === key ? "bg-brand text-white" : "bg-amber-100 text-amber-700"
              }`}>
                {pending[key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* 요약 바 */}
      <div className="px-6 py-3 bg-gray-50 border-b border-gray-100 flex items-center gap-6 text-xs text-gray-500">
        {active === "cash" && (
          <>
            <span>소득공제용 <strong className="text-gray-800">{cashRows.filter((r) => r.receipt.purpose === "INCOME").length}건</strong></span>
            <span>지출증빙용 <strong className="text-gray-800">{cashRows.filter((r) => r.receipt.purpose === "EXPENSE").length}건</strong></span>
            <span>미완료 <strong className="text-amber-700">{pending.cash}건</strong></span>
            <span>합계 <strong className="text-gray-800">{cashRows.reduce((s, r) => s + r.amount, 0).toLocaleString()}원</strong></span>
          </>
        )}
        {active === "invoice" && (
          <>
            <span>전체 <strong className="text-gray-800">{invoiceRows.length}건</strong></span>
            <span>미완료 <strong className="text-amber-700">{pending.invoice}건</strong></span>
            <span>공급가액 합계 <strong className="text-gray-800">{invoiceRows.reduce((s, r) => s + r.amount, 0).toLocaleString()}원</strong></span>
          </>
        )}
        {active === "withholding" && (
          <>
            <span>전체 <strong className="text-gray-800">{withdrawalRows.length}건</strong></span>
            <span>미완료 <strong className="text-amber-700">{pending.withholding}건</strong></span>
            <span>출금액 합계 <strong className="text-gray-800">{withdrawalRows.reduce((s, r) => s + r.amount, 0).toLocaleString()}원</strong></span>
          </>
        )}
      </div>

      {/* 탭 콘텐츠 */}
      <div className="min-h-[320px]">
        {active === "cash"        && <CashReceiptTab rows={cashRows}        onToggle={toggleCash}        />}
        {active === "invoice"     && <TaxInvoiceTab  rows={invoiceRows}     onToggle={toggleInvoice}     />}
        {active === "withholding" && <WithdrawalTab  rows={withdrawalRows}  onToggle={toggleWithdrawal}  />}
      </div>
    </div>
  )
}
