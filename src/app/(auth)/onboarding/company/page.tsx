"use client"
import { useRouter } from "next/navigation"
import { Building2, ArrowRight, CheckCircle2 } from "lucide-react"

const BENEFITS = [
  "SOS 긴급 요청으로 당일 결원을 8분 안에 해결",
  "검증된 경비 인력 풀에서 즉시 검색",
  "매칭 이력 · 평점 · 계약 관리 통합",
]

export default function CompanyOnboardingPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-8 space-y-6">
          {/* 아이콘 */}
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-2xl bg-blue-50 flex items-center justify-center">
              <Building2 className="w-10 h-10 text-brand" />
            </div>
          </div>

          {/* 타이틀 */}
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-gray-900">업체 대표로 시작합니다</h2>
            <p className="text-sm text-gray-500 leading-relaxed">
              경비업 허가번호와 업체 정보를 등록하면<br />
              즉시 인력 매칭 서비스를 이용하실 수 있습니다.
            </p>
          </div>

          {/* 혜택 리스트 */}
          <div className="space-y-3">
            {BENEFITS.map((benefit) => (
              <div key={benefit} className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-brand shrink-0 mt-0.5" />
                <span className="text-sm text-gray-700">{benefit}</span>
              </div>
            ))}
          </div>

          {/* 계속하기 버튼 */}
          <button
            onClick={() => router.push("/consent")}
            className="w-full h-11 flex items-center justify-center gap-2
                       bg-brand text-white font-semibold rounded-xl
                       hover:bg-blue-700 transition-colors"
          >
            계속하기
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <p className="text-center text-xs text-gray-400">
          이미 계정이 있으신가요?{" "}
          <button
            onClick={() => router.push("/login")}
            className="text-brand hover:underline"
          >
            로그인
          </button>
        </p>
      </div>
    </div>
  )
}
