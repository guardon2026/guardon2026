"use client"

import { useState } from "react"
import { CheckCircle2, AlertCircle, Loader2, Eye, EyeOff } from "lucide-react"
import { cn } from "@/lib/utils"

interface Props {
  rrnVerifiedAt: Date | null
  bankVerifiedAt: Date | null
  bankName: string | null
  bankAccount: string | null
  bankHolder: string | null
}

const BANKS = [
  "KB국민은행", "신한은행", "우리은행", "하나은행", "IBK기업은행",
  "NH농협은행", "카카오뱅크", "토스뱅크", "케이뱅크", "SC제일은행",
  "씨티은행", "부산은행", "경남은행", "대구은행", "광주은행",
  "전북은행", "제주은행", "우체국", "새마을금고", "신협",
]

export default function VerificationForm({ rrnVerifiedAt, bankVerifiedAt, bankName, bankAccount, bankHolder }: Props) {
  const [rrnInput, setRrnInput] = useState("")
  const [showRrn, setShowRrn] = useState(false)
  const [rrnDone, setRrnDone] = useState(!!rrnVerifiedAt)
  const [rrnLoading, setRrnLoading] = useState(false)
  const [rrnError, setRrnError] = useState("")

  const [selBank, setSelBank] = useState(bankName ?? "")
  const [accountNum, setAccountNum] = useState(bankAccount ?? "")
  const [holder, setHolder] = useState(bankHolder ?? "")
  const [bankDone, setBankDone] = useState(!!bankVerifiedAt)
  const [bankLoading, setBankLoading] = useState(false)
  const [bankError, setBankError] = useState("")

  function formatRrn(val: string) {
    const digits = val.replace(/\D/g, "").slice(0, 13)
    if (digits.length <= 6) return digits
    return `${digits.slice(0, 6)}-${digits.slice(6)}`
  }

  async function submitRrn() {
    setRrnError("")
    setRrnLoading(true)
    try {
      const res = await fetch("/api/worker/verification", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "rrn", rrn: rrnInput }),
      })
      const data = await res.json()
      if (!res.ok) { setRrnError(data.error); return }
      setRrnDone(true)
      setRrnInput("")
    } catch {
      setRrnError("오류가 발생했습니다. 다시 시도해 주세요.")
    } finally {
      setRrnLoading(false)
    }
  }

  async function submitBank() {
    setBankError("")
    setBankLoading(true)
    try {
      const res = await fetch("/api/worker/verification", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "bank", bankName: selBank, bankAccount: accountNum, bankHolder: holder }),
      })
      const data = await res.json()
      if (!res.ok) { setBankError(data.error); return }
      setBankDone(true)
    } catch {
      setBankError("오류가 발생했습니다. 다시 시도해 주세요.")
    } finally {
      setBankLoading(false)
    }
  }

  return (
    <div className="space-y-6">

      {/* 주민등록번호 인증 */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900">주민등록번호 인증</h2>
            <p className="text-xs text-gray-500 mt-0.5">근로계약서 및 원천징수 신고에 사용됩니다.</p>
          </div>
          {rrnDone
            ? <span className="flex items-center gap-1.5 text-xs font-semibold text-green-600 bg-green-50 px-3 py-1.5 rounded-full"><CheckCircle2 className="w-3.5 h-3.5" />인증 완료</span>
            : <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 bg-amber-50 px-3 py-1.5 rounded-full"><AlertCircle className="w-3.5 h-3.5" />미인증</span>
          }
        </div>

        {rrnDone ? (
          <div className="bg-green-50 rounded-xl px-4 py-3 text-sm text-green-700 font-medium">
            주민등록번호가 등록되었습니다. 뒷자리는 안전하게 마스킹 처리됩니다.
          </div>
        ) : (
          <div className="space-y-3">
            <div className="relative">
              <input
                type={showRrn ? "text" : "password"}
                value={rrnInput}
                onChange={(e) => setRrnInput(formatRrn(e.target.value))}
                placeholder="000000-0000000"
                maxLength={14}
                className="w-full px-4 py-2.5 pr-10 rounded-xl border border-gray-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
              />
              <button
                type="button"
                onClick={() => setShowRrn((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showRrn ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {rrnError && <p className="text-xs text-red-500">{rrnError}</p>}
            <p className="text-xs text-gray-400">뒷자리 첫 숫자만 저장되며 나머지는 즉시 마스킹 처리됩니다.</p>
            <button
              onClick={submitRrn}
              disabled={rrnLoading || rrnInput.length < 14}
              className={cn(
                "w-full py-2.5 rounded-xl text-sm font-semibold transition-colors",
                rrnInput.length >= 14 && !rrnLoading
                  ? "bg-brand text-white hover:opacity-90"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed",
              )}
            >
              {rrnLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "인증 등록"}
            </button>
          </div>
        )}
      </div>

      {/* 계좌 인증 */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900">계좌 정보 등록</h2>
            <p className="text-xs text-gray-500 mt-0.5">급여 지급 및 포인트 출금에 사용됩니다.</p>
          </div>
          {bankDone
            ? <span className="flex items-center gap-1.5 text-xs font-semibold text-green-600 bg-green-50 px-3 py-1.5 rounded-full"><CheckCircle2 className="w-3.5 h-3.5" />등록 완료</span>
            : <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 bg-amber-50 px-3 py-1.5 rounded-full"><AlertCircle className="w-3.5 h-3.5" />미등록</span>
          }
        </div>

        {bankDone && !bankLoading ? (
          <div className="space-y-3">
            <div className="bg-green-50 rounded-xl px-4 py-3 space-y-1">
              <p className="text-sm font-semibold text-green-800">{selBank || bankName}</p>
              <p className="text-sm text-green-700">{accountNum || bankAccount}</p>
              <p className="text-xs text-green-600">예금주: {holder || bankHolder}</p>
            </div>
            <button
              onClick={() => setBankDone(false)}
              className="text-xs text-brand font-medium hover:underline"
            >
              계좌 정보 변경
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">은행 선택</label>
              <select
                value={selBank}
                onChange={(e) => setSelBank(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand bg-white"
              >
                <option value="">은행을 선택해 주세요</option>
                {BANKS.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">계좌번호</label>
              <input
                type="text"
                value={accountNum}
                onChange={(e) => setAccountNum(e.target.value.replace(/[^\d-]/g, ""))}
                placeholder="'-' 없이 숫자만 입력"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">예금주명</label>
              <input
                type="text"
                value={holder}
                onChange={(e) => setHolder(e.target.value)}
                placeholder="예금주 실명"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
              />
            </div>
            {bankError && <p className="text-xs text-red-500">{bankError}</p>}
            <button
              onClick={submitBank}
              disabled={bankLoading || !selBank || !accountNum || !holder}
              className={cn(
                "w-full py-2.5 rounded-xl text-sm font-semibold transition-colors",
                selBank && accountNum && holder && !bankLoading
                  ? "bg-brand text-white hover:opacity-90"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed",
              )}
            >
              {bankLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "계좌 등록"}
            </button>
          </div>
        )}
      </div>

    </div>
  )
}
