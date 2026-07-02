import Link from "next/link"
import { CheckCircle2, Shield, Users } from "lucide-react"
import { AUTH } from "@/lib/constants"

const FEATURES = [
  {
    icon: CheckCircle2,
    title: "빠른 매칭",
    desc: "당일 결원을 8분 안에 해결합니다.",
  },
  {
    icon: Users,
    title: "검증된 인력",
    desc: "자격증·경력 인증 완료 인력만 매칭됩니다.",
  },
  {
    icon: Shield,
    title: "안전한 플랫폼",
    desc: "계약·정산·이력 모두 플랫폼 내에서 처리됩니다.",
  },
]

export default function LoginPage() {
  const isDev = process.env.NODE_ENV === "development"

  return (
    <div className="min-h-screen flex">
      {/* 좌측 브랜딩 패널 */}
      <div className="flex w-1/2 bg-gray-900 flex-col justify-between p-12">
        <div>
          <Link href="/" className="text-2xl font-bold text-white hover:text-gray-200 transition-colors">GuardOn</Link>
        </div>
        <div className="space-y-8">
          <div>
            <h2 className="text-4xl font-bold text-white leading-tight">
              당일 결원,<br />8분 해결
            </h2>
            <p className="mt-4 text-gray-400 text-base leading-relaxed">
              경비·보안 인력 시장의 새로운 표준.<br />
              전화 없이, 즉시 매칭됩니다.
            </p>
          </div>
          <div className="space-y-5">
            {FEATURES.map((f) => (
              <div key={f.title} className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0 mt-0.5">
                  <f.icon className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{f.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <p className="text-xs text-gray-600">
          © 2026 GuardOn. All rights reserved.
        </p>
      </div>

      {/* 우측 로그인 카드 */}
      <div className="flex-1 flex items-center justify-center bg-gray-50 px-4 py-12">
        <div className="w-full max-w-sm">
          <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-8 space-y-6">
            <div className="text-center space-y-1">
              <h1 className="text-2xl font-bold text-gray-900">{AUTH.loginTitle}</h1>
              <p className="text-sm text-gray-500">{AUTH.loginSubtitle}</p>
            </div>

            {/* 카카오 로그인 — GET 리다이렉트 */}
            <a
              href="/api/auth/login/kakao"
              className="w-full h-12 flex items-center justify-center gap-2.5
                         bg-[#FEE500] hover:bg-[#FDD835] text-gray-900
                         font-semibold rounded-xl transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 512 512"
                className="w-5 h-5"
                aria-hidden="true"
              >
                <path d="M255.5 48C138.0 48 42 123.8 42 218.1c0 60.4 38.5 113.4 96.7 144.1l-24.7 90.2c-2.2 8.0 6.9 14.4 13.8 9.5l104.9-71.2a282 282 0 0 0 22.8.9c117.5 0 213.5-75.8 213.5-170.1S373.0 48 255.5 48z" />
              </svg>
              {AUTH.kakaoLoginBtn}
            </a>

            {/* 개발 환경 전용 */}
            {isDev && (
              <>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-gray-200" />
                  <span className="text-xs text-gray-400">또는</span>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>
                <div className="text-center">
                  <Link
                    href="/dev-login"
                    className="text-xs text-gray-400 hover:text-brand transition-colors"
                  >
                    [개발 전용] 역할 선택
                  </Link>
                </div>
              </>
            )}

            <p className="text-xs text-gray-400 text-center leading-relaxed">
              가입하면 이용약관 및 개인정보처리방침에<br />
              동의하는 것으로 간주됩니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
