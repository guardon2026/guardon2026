"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle2, AlertCircle, Loader2, ShieldCheck } from "lucide-react"
import { cn } from "@/lib/utils"

interface Props {
  bankName: string | null
  bankAccount: string | null
  bankHolder: string | null
  bankVerifiedAt: Date | null
}

const BANKS = [
  "KB국민은행", "신한은행", "우리은행", "하나은행", "IBK기업은행",
  "NH농협은행", "카카오뱅크", "토스뱅크", "케이뱅크", "SC제일은행",
  "씨티은행", "부산은행", "경남은행", "대구은행", "광주은행",
  "전북은행", "제주은행", "우체국", "새마을금고", "신협",
]

export default function BankSection({ bankName, bankAccount, bankHolder, bankVerifiedAt }: Props) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [selBank, setSelBank] = useState(bankName ?? "")
  const [accountNum, setAccountNum] = useState(bankAccount ?? "")
  const [holder, setHolder] = useState(bankHolder ?? "")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const registered = !!bankVerifiedAt

  function startEdit() {
    setSelBank(bankName ?? "")
    setAccountNum(bankAccount ?? "")
    setHolder(bankHolder ?? "")
    setError("")
    setEditing(true)
  }

  async function submit() {
    setError("")
    setLoading(true)
    try {
      const res = await fetch("/api/worker/verification", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "bank", bankName: selBank, bankAccount: accountNum, bankHolder: holder }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      setEditing(false)
      router.refresh()
    } catch {
      setError("오류가 발생했습니다. 다시 시도해 주세요.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-brand" />
            계좌 정보
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">급여 지급 및 포인트 출금에 사용됩니다.</p>
        </div>
        {registered
          ? <span className="flex items-center gap-1.5 text-xs font-semibold text-green-600 bg-green-50 px-3 py-1.5 rounded-full"><CheckCircle2 className="w-3.5 h-3.5" />등록 완료</span>
          : <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 bg-amber-50 px-3 py-1.5 rounded-full"><AlertCircle className="w-3.5 h-3.5" />미등록</span>
        }
      </div>

      {!editing ? (
        registered ? (
          <div className="space-y-3">
            <div className="bg-green-50 rounded-xl px-4 py-3 space-y-1">
              <p className="text-sm font-semibold text-green-800">{bankName}</p>
              <p className="text-sm text-green-700">{bankAccount}</p>
              <p className="text-xs text-green-600">예금주: {bankHolder}</p>
            </div>
            <button
              onClick={startEdit}
              className="text-xs text-brand font-medium hover:underline"
            >
              계좌 정보 변경
            </button>
          </div>
        ) : (
          <button
            onClick={startEdit}
            className="w-full py-2.5 rounded-xl text-sm font-semibold bg-brand text-white hover:opacity-90 transition-opacity"
          >
            계좌 등록하기
          </button>
        )
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
          <p className="text-xs text-gray-400">입력 형식만 확인하며, 실제 예금주 일치 여부는 검증되지 않습니다.</p>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex gap-2">
            {registered && (
              <button
                onClick={() => setEditing(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
            )}
            <button
              onClick={submit}
              disabled={loading || !selBank || !accountNum || !holder}
              className={cn(
                "flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors",
                selBank && accountNum && holder && !loading
                  ? "bg-brand text-white hover:opacity-90"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed",
              )}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "저장"}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
