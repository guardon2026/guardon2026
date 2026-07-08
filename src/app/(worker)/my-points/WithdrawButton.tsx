"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowUpCircle, X } from "lucide-react"

function formatComma(raw: string) {
  const digits = raw.replace(/\D/g, "")
  if (!digits) return ""
  return Number(digits).toLocaleString("ko-KR")
}

function formatResidentNumber(raw: string) {
  const digits = raw.replace(/\D/g, "").slice(0, 13)
  if (digits.length <= 6) return digits
  return `${digits.slice(0, 6)}-${digits.slice(6)}`
}

export default function WithdrawButton({ balance }: { balance: number }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState("")
  const [realName, setRealName] = useState("")
  const [residentNumber, setResidentNumber] = useState("")
  const [bankName, setBankName] = useState("")
  const [accountNumber, setAccountNumber] = useState("")
  const [accountHolder, setAccountHolder] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  function close() {
    if (loading) return
    setOpen(false)
    setAmount("")
    setRealName("")
    setResidentNumber("")
    setBankName("")
    setAccountNumber("")
    setAccountHolder("")
    setError("")
    setSuccess(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const numAmount = Number(amount.replace(/,/g, ""))
    if (!numAmount || numAmount < 1000) { setError("출금 금액은 최소 1,000P 이상이어야 합니다."); return }
    if (numAmount > balance) { setError(`보유 포인트(${balance.toLocaleString()}P)를 초과할 수 없습니다.`); return }
    if (!realName.trim()) { setError("실명을 입력해 주세요."); return }
    const rnDigits = residentNumber.replace(/\D/g, "")
    if (rnDigits.length !== 13) { setError("주민등록번호 13자리를 모두 입력해 주세요."); return }
    if (!bankName.trim()) { setError("은행명을 입력해 주세요."); return }
    if (!accountNumber.trim()) { setError("계좌번호를 입력해 주세요."); return }
    if (!accountHolder.trim()) { setError("예금주명을 입력해 주세요."); return }

    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/points/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: numAmount,
          realName: realName.trim(),
          residentNumber: residentNumber.replace(/\D/g, ""),
          bankName: bankName.trim(),
          accountNumber: accountNumber.trim(),
          accountHolder: accountHolder.trim(),
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? "출금 신청 중 오류가 발생했습니다."); return }
      setSuccess(true)
      router.refresh()
    } catch {
      setError("네트워크 오류가 발생했습니다.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-semibold transition-colors shadow-sm"
      >
        <ArrowUpCircle className="w-4 h-4" />
        출금하기
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
          onClick={(e) => { if (e.target === e.currentTarget) close() }}
        >
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
              <span className="font-semibold text-gray-900">포인트 출금</span>
              <button type="button" onClick={close} className="text-gray-400 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            {success ? (
              <div className="px-5 py-8 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                  <ArrowUpCircle className="w-6 h-6 text-green-600" />
                </div>
                <p className="font-semibold text-gray-900">출금 신청 완료</p>
                <p className="text-sm text-gray-500">출금 신청이 접수되었습니다.<br />1~3 영업일 내 입금됩니다.</p>
                <button
                  type="button"
                  onClick={close}
                  className="mt-2 w-full py-2.5 rounded-xl bg-brand text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
                >
                  확인
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="px-5 py-5 space-y-4">
                {/* 보유 포인트 */}
                <div className="bg-gray-50 rounded-xl px-4 py-3 text-sm">
                  <span className="text-gray-400">보유 포인트</span>
                  <span className="ml-2 font-bold text-gray-900">{balance.toLocaleString()}P</span>
                </div>

                {/* 출금 금액 */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">출금 금액 <span className="text-red-500">*</span></label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={amount}
                      onChange={(e) => setAmount(formatComma(e.target.value))}
                      placeholder="0"
                      className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                    />
                    <span className="text-sm text-gray-500 shrink-0">P</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAmount(balance.toLocaleString("ko-KR"))}
                    className="text-xs text-brand hover:underline"
                  >
                    전액 출금
                  </button>
                </div>

                {/* 세금 신고 정보 */}
                <div className="space-y-3 pt-1 pb-1 border-t border-b border-gray-100">
                  <p className="text-xs font-semibold text-gray-500 pt-1">세금 신고 정보</p>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-700">실명 <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      value={realName}
                      onChange={(e) => setRealName(e.target.value)}
                      placeholder="예) 홍길동"
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-700">주민등록번호 <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={residentNumber}
                      onChange={(e) => setResidentNumber(formatResidentNumber(e.target.value))}
                      placeholder="XXXXXX-XXXXXXX"
                      maxLength={14}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand tracking-widest"
                    />
                    <p className="text-xs text-gray-400">소득세 원천징수 신고를 위해 사용됩니다.</p>
                  </div>
                </div>

                {/* 은행명 */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">은행명 <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="예) 국민은행"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                  />
                </div>

                {/* 계좌번호 */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">계좌번호 <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value.replace(/[^\d-]/g, ""))}
                    placeholder="예) 123-456-789012"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                  />
                </div>

                {/* 예금주 */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">예금주명 <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={accountHolder}
                    onChange={(e) => setAccountHolder(e.target.value)}
                    placeholder="예) 홍길동"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                  />
                </div>

                {error && <p className="text-xs text-red-600">{error}</p>}

                <p className="text-xs text-gray-400">출금 신청 후 1~3 영업일 내 입금됩니다.</p>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-brand text-white text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {loading ? "처리 중..." : "출금 신청하기"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}
