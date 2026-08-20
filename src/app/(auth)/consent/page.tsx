"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { CheckCircle2, Circle, ChevronDown } from "lucide-react"
import { AUTH } from "@/lib/constants"

type ConsentState = {
  TERMS: boolean
  PRIVACY: boolean
  LOCATION: boolean
}

const CONSENT_ITEMS: { key: keyof ConsentState; label: string; required: boolean; detail: string }[] = [
  {
    key: "PRIVACY",
    label: AUTH.consentPersonalInfo,
    required: true,
    detail: `수집 항목: 카카오 계정 정보(이름, 이메일, 프로필 사진), 서비스 이용 기록\n\n수집 목적: 회원 가입 및 본인 확인, 서비스 제공 및 개선, 고객 문의 처리\n\n보유 기간: 회원 탈퇴 시 즉시 삭제 (단, 관계 법령에 따라 일정 기간 보관할 수 있음)\n\n※ 위 동의를 거부할 권리가 있으나, 거부 시 서비스 이용이 제한됩니다.`,
  },
  {
    key: "LOCATION",
    label: AUTH.consentLocation,
    required: true,
    detail: `수집 항목: GPS 기반 위치 정보 (현장 출·퇴근 확인 시)\n\n수집 목적: 경비원 현장 출·퇴근 확인 및 SOS 긴급 위치 전송\n\n보유 기간: 출·퇴근 기록 보존 기간(최대 3년) 또는 회원 탈퇴 시까지\n\n※ 위치정보 수집에 동의하지 않을 경우 현장 출·퇴근 및 SOS 기능을 이용할 수 없습니다.`,
  },
  {
    key: "TERMS",
    label: AUTH.consentTerms,
    required: true,
    detail: `제1조 (목적) 본 약관은 GuardOn 서비스 이용에 관한 조건 및 절차, 회사와 회원 간의 권리·의무 및 책임 사항을 규정합니다.\n\n제2조 (서비스 이용) 회원은 본 약관에 동의하고 서비스를 이용할 수 있으며, 관계 법령을 준수하여야 합니다.\n\n제3조 (금지 행위) 타인의 정보 도용, 서비스 방해, 불법 정보 게시 등의 행위를 금지합니다.\n\n제4조 (서비스 중단) 회사는 시스템 점검·장애·천재지변 등의 사유로 서비스를 일시 중단할 수 있습니다.\n\n제5조 (준거법) 본 약관은 대한민국 법령에 따라 해석되며, 분쟁 시 서울중앙지방법원을 관할 법원으로 합니다.`,
  },
]

const STEPS = ["역할 선택", "약관 동의", "완료"]

async function waitForSessionRole(expectedRole: string | null, maxAttempts = 10, delayMs = 150) {
  if (!expectedRole) return
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const res = await fetch("/api/auth/session", { cache: "no-store" })
      const session = await res.json().catch(() => null)
      if (session?.user?.role === expectedRole) return
    } catch {
      // 네트워크 오류는 무시하고 재시도
    }
    await new Promise((resolve) => setTimeout(resolve, delayMs))
  }
}

export default function ConsentPage() {
  const router = useRouter()
  const { update } = useSession()
  const [consent, setConsent] = useState<ConsentState>({
    TERMS: false,
    PRIVACY: false,
    LOCATION: false,
  })
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
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
      await update()
      // update() 호출이 반환되어도 브라우저에 새 세션 쿠키가 실제로 반영되기까지
      // 미세한 지연이 있을 수 있다 — 그 사이 hard redirect하면 미들웨어가 아직
      // role이 없는 예전 JWT를 읽어 /unauthorized로 튕겨내는 경합이 발생한다.
      // 세션에 새 role이 실제로 반영됐는지 짧게 폴링해서 확인한 뒤 이동한다.
      await waitForSessionRole(pendingRole)
      window.location.href = pendingRole === "COMPANY_OWNER" ? "/register" : "/profile"
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
            {CONSENT_ITEMS.map(({ key, label, required, detail }) => (
              <div
                key={key}
                className={`rounded-xl border transition-colors
                  ${consent[key] ? "border-brand bg-blue-50/50" : "border-gray-100 bg-gray-50"}`}
              >
                <label className="flex items-center gap-3 p-4 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={consent[key]}
                    onChange={(e) =>
                      setConsent((prev) => ({ ...prev, [key]: e.target.checked }))
                    }
                    className="w-4 h-4 accent-brand shrink-0"
                  />
                  <span className="text-sm text-gray-700 flex-1">{label}</span>
                  {required && (
                    <span className="text-xs font-semibold text-sos bg-red-50 px-2 py-0.5 rounded-full shrink-0">
                      필수
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      setExpanded((prev) => ({ ...prev, [key]: !prev[key] }))
                    }}
                    className="ml-1 text-gray-400 hover:text-gray-600 transition-colors shrink-0"
                    aria-label="약관 내용 펼치기"
                  >
                    <ChevronDown
                      className={`w-4 h-4 transition-transform duration-200 ${expanded[key] ? "rotate-180" : ""}`}
                    />
                  </button>
                </label>
                {expanded[key] && (
                  <div className="px-4 pb-4">
                    <div className="text-xs text-gray-500 leading-relaxed whitespace-pre-line bg-white rounded-lg p-3 border border-gray-100">
                      {detail}
                    </div>
                  </div>
                )}
              </div>
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
