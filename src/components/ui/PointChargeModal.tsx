"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { X, Coins, CheckCircle2, Receipt } from "lucide-react"

function formatPhone(raw: string) {
  const d = raw.replace(/\D/g, "").slice(0, 11)
  if (d.length <= 3) return d
  if (d.length <= 7) return `${d.slice(0, 3)}-${d.slice(3)}`
  return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`
}

function formatBizNum(raw: string) {
  const d = raw.replace(/\D/g, "").slice(0, 10)
  if (d.length <= 3) return d
  if (d.length <= 5) return `${d.slice(0, 3)}-${d.slice(3)}`
  return `${d.slice(0, 3)}-${d.slice(3, 5)}-${d.slice(5)}`
}

export function PointChargeModal({
  onClose,
  onSuccess,
  shortfall = 0,
  showReceipt = false,
}: {
  onClose: () => void
  onSuccess?: () => void
  shortfall?: number
  showReceipt?: boolean
}) {
  const router = useRouter()
  const [customRaw, setCustomRaw] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  // 영수증 관련 상태
  const [receiptType, setReceiptType] = useState<"CASH_RECEIPT" | "TAX_INVOICE">("CASH_RECEIPT")
  const [cashPurpose, setCashPurpose] = useState<"INCOME" | "EXPENSE">("INCOME")
  const [cashNumber, setCashNumber] = useState("")
  const [taxBizNum, setTaxBizNum] = useState("")
  const [taxCompany, setTaxCompany] = useState("")
  const [taxCeo, setTaxCeo] = useState("")
  const [taxEmail, setTaxEmail] = useState("")
  const [taxEmailError, setTaxEmailError] = useState("")

  const customAmount = customRaw ? parseInt(customRaw.replace(/,/g, ""), 10) : NaN
  const finalAmount = !isNaN(customAmount) && customAmount > 0 ? customAmount : null

  function fillShortfall() {
    if (shortfall > 0) setCustomRaw(shortfall.toLocaleString())
  }

  function buildReceiptInfo() {
    if (!showReceipt) return undefined
    if (receiptType === "CASH_RECEIPT") {
      return { type: "CASH_RECEIPT", purpose: cashPurpose, number: cashNumber }
    }
    return {
      type: "TAX_INVOICE",
      businessNumber: taxBizNum,
      companyName: taxCompany,
      ceoName: taxCeo,
      email: taxEmail,
    }
  }

  async function handleCharge() {
    if (!finalAmount || finalAmount < 1000) { setError("1,000P 이상 입력해 주세요."); return }
    if (showReceipt) {
      if (receiptType === "CASH_RECEIPT" && !cashNumber.trim()) {
        setError("현금영수증 번호를 입력해 주세요."); return
      }
      if (receiptType === "TAX_INVOICE") {
        if (taxBizNum.replace(/\D/g, "").length !== 10) { setError("사업자등록번호 10자리를 입력해 주세요."); return }
        if (!taxCompany.trim()) { setError("상호를 입력해 주세요."); return }
        if (!taxCeo.trim()) { setError("대표자명을 입력해 주세요."); return }
        if (taxEmailError || !taxEmail.trim()) { setError("올바른 이메일을 입력해 주세요."); return }
      }
    }
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/points/self-charge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: finalAmount, receiptInfo: buildReceiptInfo() }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? "충전 중 오류가 발생했습니다."); return }
      setSuccess(`${finalAmount.toLocaleString()}P 충전 완료! 새 잔액: ${data.balance.toLocaleString()}P`)
      setTimeout(() => {
        router.refresh()
        if (onSuccess) onSuccess()
        else onClose()
      }, 1500)
    } catch {
      setError("네트워크 오류가 발생했습니다.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6 space-y-5">
          {/* 헤더 */}
          <div className="flex items-center justify-between sticky top-0 bg-white z-10">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Coins className="w-4 h-4 text-amber-500" />
              포인트 충전
            </h2>
            <button type="button" onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors">
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>

          {/* 부족한 포인트 전액 버튼 */}
          {shortfall > 0 && (
            <button
              type="button"
              onClick={fillShortfall}
              className="w-full py-3 rounded-xl border-2 border-amber-400 bg-amber-50 text-amber-700 text-sm font-bold hover:bg-amber-100 transition-colors flex items-center justify-center gap-2"
            >
              <Coins className="w-4 h-4" />
              부족한 포인트 전액 충전 ({shortfall.toLocaleString()}P)
            </button>
          )}

          {/* 직접 입력 */}
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-gray-400">충전 금액 직접 입력</p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                inputMode="numeric"
                value={customRaw}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, "")
                  setCustomRaw(digits ? Number(digits).toLocaleString() : "")
                }}
                placeholder="금액 입력 (최소 1,000P)"
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
              />
              <span className="text-sm text-gray-500 shrink-0">P</span>
            </div>
          </div>

          {/* 최종 충전 금액 표시 */}
          {finalAmount && finalAmount > 0 && (
            <div className="bg-amber-50 rounded-xl px-4 py-3 text-center">
              <span className="text-xs text-gray-500">충전 예정 금액</span>
              <p className="text-xl font-extrabold text-amber-600 mt-0.5">{finalAmount.toLocaleString()}P</p>
            </div>
          )}

          {/* ── 지출 영수증 발행 (업체 대표 전용) ── */}
          {showReceipt && (
            <div className="border border-gray-200 rounded-xl p-4 space-y-4">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-gray-500" />
                <p className="text-sm font-semibold text-gray-700">지출 영수증 발행</p>
              </div>

              {/* 발행 유형 */}
              <div className="flex gap-2">
                {(["CASH_RECEIPT", "TAX_INVOICE"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setReceiptType(t)}
                    className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-colors ${
                      receiptType === t
                        ? "bg-brand text-white border-brand"
                        : "bg-white text-gray-600 border-gray-200 hover:border-brand"
                    }`}
                  >
                    {t === "CASH_RECEIPT" ? "현금영수증" : "세금계산서"}
                  </button>
                ))}
              </div>

              {/* 현금영수증 */}
              {receiptType === "CASH_RECEIPT" && (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    {(["INCOME", "EXPENSE"] as const).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => { setCashPurpose(p); setCashNumber("") }}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                          cashPurpose === p
                            ? "bg-gray-800 text-white border-gray-800"
                            : "bg-white text-gray-500 border-gray-200 hover:border-gray-400"
                        }`}
                      >
                        {p === "INCOME" ? "소득공제용" : "지출증빙용"}
                      </button>
                    ))}
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-600">
                      {cashPurpose === "INCOME" ? "휴대폰번호" : "사업자번호"} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={cashNumber}
                      onChange={(e) =>
                        setCashNumber(
                          cashPurpose === "INCOME"
                            ? formatPhone(e.target.value)
                            : formatBizNum(e.target.value)
                        )
                      }
                      placeholder={cashPurpose === "INCOME" ? "010-0000-0000" : "000-00-00000"}
                      maxLength={cashPurpose === "INCOME" ? 13 : 12}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                    />
                  </div>
                </div>
              )}

              {/* 세금계산서 */}
              {receiptType === "TAX_INVOICE" && (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-600">사업자등록번호 <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={taxBizNum}
                      onChange={(e) => setTaxBizNum(formatBizNum(e.target.value))}
                      placeholder="000-00-00000"
                      maxLength={12}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-600">상호 <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      value={taxCompany}
                      onChange={(e) => setTaxCompany(e.target.value)}
                      placeholder="예) (주)가드온"
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-600">대표자명 <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      value={taxCeo}
                      onChange={(e) => setTaxCeo(e.target.value)}
                      placeholder="예) 홍길동"
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-600">이메일 <span className="text-red-500">*</span></label>
                    <input
                      type="email"
                      inputMode="email"
                      value={taxEmail}
                      onChange={(e) => {
                        setTaxEmail(e.target.value)
                        setTaxEmailError(
                          e.target.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.target.value)
                            ? "올바른 이메일 형식을 입력해 주세요."
                            : ""
                        )
                      }}
                      placeholder="example@company.com"
                      className={`w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand ${taxEmailError ? "border-red-400" : "border-gray-200"}`}
                    />
                    {taxEmailError && <p className="text-xs text-red-500">{taxEmailError}</p>}
                  </div>
                </div>
              )}
            </div>
          )}

          {error && <p className="text-xs text-red-600">{error}</p>}
          {success && (
            <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 rounded-xl px-3 py-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              {success}
            </div>
          )}

          <button
            type="button"
            onClick={handleCharge}
            disabled={loading || !finalAmount || finalAmount < 1000 || !!success}
            className="w-full py-3 rounded-xl bg-brand text-white text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? "처리 중..." : "충전하기"}
          </button>

          <p className="text-center text-xs text-gray-400">
            1P = 1원으로 환산됩니다.
          </p>
        </div>
      </div>
    </div>
  )
}

export default PointChargeModal
