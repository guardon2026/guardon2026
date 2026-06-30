"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle2, Circle } from "lucide-react"
import { AUTH } from "@/lib/constants"

type ConsentState = {
  TERMS: boolean
  PRIVACY: boolean
  LOCATION: boolean
}

const CONSENT_ITEMS: { key: keyof ConsentState; label: string; required: boolean }[] = [
  { key: "PRIVACY", label: AUTH.consentPersonalInfo, required: true },
  { key: "LOCATION", label: AUTH.consentLocation, required: true },
  { key: "TERMS", label: AUTH.consentTerms, required: true },
]

const STEPS = ["역할 선택", "약관 동의", "완료"]

export default function ConsentPage() {
  const router = useRouter()
  const [consent, setConsent] = useState<ConsentState>({
    TERMS: false,
    PRIVACY: false,
    LOCATION: false,
  })
  const [submitting, setSubmitting] = useState(false)
  const [pendingRole, setPendingRole] = useState<string | null>(null)

  useEffect(() => {
    const role = sessionStorage.getItem("pending_role")
    if (!role) {
      router.replace("/onboarding")
    } else {
      setPendingRole(role)
    }
  }, [router])

  const allChecked = Object.values(consent).every(Boolean)

  const handleToggleAll = () => {
    const next = !allChecked
    setConsent({ TERMS: next, PRIVACY: next, LOCATION: next })
  }

  const handleSubmit = async () => {
    if (!allChecked) {
      alert(AUTH.consentRequiredAlert)
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: pendingRole, consents: Object.keys(consent) }),
      })
      if (!res.ok) throw new Error("등록 실패")
      sessionStorage.removeItem("pending_role")
      if (pendingRole === "COMPANY_OWNER") {
        router.push("/register")
      } else {
        router.push("/profile/edit")
      }
    } catch {
      alert("오류가 발생했습니다. 다시 시도해 주세요.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md space-y-6">

        {/* 진행 바 */}
        <div className="flex items-center gap-0">
          {STEPS.map((step, i) => (
            <div key={step} className="flex items-center">
              <div className="flex flex-col items-center gap-1">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold
                    ${i === 1
                      ? "bg-brand text-white"
                      : i < 1
                      ? "bg-green-500 text-white"
                      : "bg-gray-200 text-gray-400"
                    }`}
                >
                  {i < 1 ? "✓" : i + 1}
                </div>
                <span className={`text-xs whitespace-nowrap ${i === 1 ? "text-brand font-semibold" : "text-gray-400"}`}>
                  {step}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`h-px w-16 mb-4 mx-1 ${i < 1 ? "bg-green-400" : "bg-gray-200"}`} />
              )}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-8 space-y-5">
          <h2 className="text-xl font-bold text-gray-900">{AUTH.consentTitle}</h2>

          {/* 전체 동의 */}
          <button
            type="button"
            onClick={handleToggleAll}
            className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-colors
              ${allChecked ? "border-brand bg-blue-50" : "border-gray-200 hover:border-gray-300"}`}
          >
            {allChecked
              ? <CheckCircle2 className="w-5 h-5 text-brand shrink-0" />
              : <Circle className="w-5 h-5 text-gray-300 shrink-0" />
            }
            <span className="text-sm font-semibold text-gray-900">전체 동의하기</span>
          </button>

          <div className="h-px bg-gray-100" />

          {/* 개별 항목 */}
          <div className="space-y-3">
            {CONSENT_ITEMS.map(({ key, label, required }) => (
              <label
                key={key}
                className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-colors
                  ${consent[key] ? "border-brand bg-blue-50/50" : "border-gray-100 bg-gray-50 hover:border-gray-200"}`}
              >
                <input
                  type="checkbox"
                  checked={consent[key]}
                  onChange={(e) =>
                    setConsent((prev) => ({ ...prev, [key]: e.target.checked }))
                  }
                  className="w-4 h-4 accent-brand"
                />
                <span className="text-sm text-gray-700 flex-1">{label}</span>
                {required && (
                  <span className="text-xs font-semibold text-sos bg-red-50 px-2 py-0.5 rounded-full shrink-0">
                    필수
                  </span>
                )}
              </label>
            ))}
          </div>

          <button
            onClick={handleSubmit}
            disabled={!allChecked || submitting}
            className="w-full h-12 bg-brand text-white rounded-xl font-semibold
                       hover:bg-blue-700 transition-colors
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "처리 중..." : "GuardOn 시작하기"}
          </button>
        </div>
      </div>
    </div>
  )
}
