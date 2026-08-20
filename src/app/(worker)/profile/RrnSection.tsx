"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle2, AlertCircle, Eye, EyeOff, Loader2, IdCard } from "lucide-react"
import { cn } from "@/lib/utils"

interface Props {
  registered: boolean
}

function formatRrn(val: string) {
  const digits = val.replace(/\D/g, "").slice(0, 13)
  if (digits.length <= 6) return digits
  return `${digits.slice(0, 6)}-${digits.slice(6)}`
}

export default function RrnSection({ registered }: Props) {
  const router = useRouter()
  const [rrnInput, setRrnInput] = useState("")
  const [showRrn, setShowRrn] = useState(false)
  const [consent, setConsent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function submit() {
    setError("")
    if (!consent) {
      setError("고유식별정보(주민등록번호) 처리 동의가 필요합니다.")
      return
    }
    setLoading(true)
    try {
      const res = await fetch("/api/worker/verification", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "rrn", rrn: rrnInput, consent }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      setRrnInput("")
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
            <IdCard className="w-4 h-4 text-brand" />
            주민등록번호
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">4대보험·세금 신고를 위해 경비 업체가 사용합니다.</p>
        </div>
        {registered
          ? <span className="flex items-center gap-1.5 text-xs font-semibold text-green-600 bg-green-50 px-3 py-1.5 rounded-full"><CheckCircle2 className="w-3.5 h-3.5" />등록 완료</span>
          : <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 bg-amber-50 px-3 py-1.5 rounded-full"><AlertCircle className="w-3.5 h-3.5" />미등록</span>
        }
      </div>

      {registered ? (
        <div className="bg-green-50 rounded-xl px-4 py-3 text-sm text-green-700 font-medium">
          <p>주민등록번호가 등록되어 안전하게 암호화 보관되고 있습니다.</p>
          <p className="text-xs font-normal text-green-600 mt-1">
            근로계약이 확정된 경비 업체만 근로계약서 화면에서 조회할 수 있으며, 등록 후에는 변경할 수 없습니다.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-xs text-blue-700 space-y-1">
            <p>· 근로계약서 작성, 4대보험 취득 신고, 원천징수 신고에 사용됩니다.</p>
            <p>· 암호화되어 저장되며, 근로계약이 확정된 업체에게만 조회 권한이 주어집니다.</p>
            <p>· 등록 후에는 변경할 수 없으니 정확히 입력해 주세요.</p>
          </div>
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
          <label className="flex items-start gap-2 text-xs text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-0.5 rounded border-gray-300"
            />
            <span>
              (필수) 고유식별정보(주민등록번호) 수집·이용에 동의합니다. 수집 목적: 근로계약서 작성 및 4대보험·세금 신고.
              보유 기간: 회원 탈퇴 시 또는 관계 법령에 따른 보관 기간 경과 시까지.
            </span>
          </label>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <button
            onClick={submit}
            disabled={loading || rrnInput.length < 14 || !consent}
            className={cn(
              "w-full py-2.5 rounded-xl text-sm font-semibold transition-colors",
              rrnInput.length >= 14 && consent && !loading
                ? "bg-brand text-white hover:opacity-90"
                : "bg-gray-100 text-gray-400 cursor-not-allowed",
            )}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "등록"}
          </button>
        </div>
      )}
    </div>
  )
}
