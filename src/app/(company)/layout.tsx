import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { XCircle, Zap, Search, History } from "lucide-react"
import { getServerSession } from "@/lib/session"
import { Sidebar } from "@/components/ui/sidebar"
import { getCompanyStatus } from "@/lib/company-gate"
import { COMPANY_PENDING } from "@/lib/constants"

const COMPANY_SIDEBAR_CONFIG = {
  subtitle: "업체 대표 콘솔",
  badgeLabel: "업체 대표",
  badgeClass: "bg-blue-500/20 text-blue-300",
  items: [
    { href: "/sos/new", label: "SOS 요청", icon: Zap },
    { href: "/search", label: "인력 검색", icon: Search },
    { href: "/company-history", label: "이력", icon: History },
  ],
}

export default async function CompanyLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession()
  if (!session?.user?.id) redirect("/login")

  const hdrs = await headers()
  const pathname = hdrs.get("x-pathname") ?? ""

  // 등록 페이지 자체는 게이트를 건너뜀 (무한 redirect 방지)
  if (pathname === "/register") {
    return <>{children}</>
  }

  const { status, name } = await getCompanyStatus(session.user.id)

  // 업체 미등록: 등록 폼으로 이동
  if (status === "NONE") {
    redirect("/register")
  }

  // 반려 상태: 인라인 반려 안내 (리다이렉트하지 않음)
  if (status === "REJECTED") {
    return (
      <div className="flex min-h-screen">
        <Sidebar role="COMPANY_OWNER" config={COMPANY_SIDEBAR_CONFIG} />
        <main className="flex-1 overflow-y-auto bg-gray-50">
          <div className="px-6 pt-[calc(1.5rem+3.5rem)] pb-6 lg:pt-8 lg:px-10 max-w-screen-2xl mx-auto">
            <div className="max-w-md mx-auto mt-16 text-center space-y-4 p-8 bg-white rounded-2xl shadow-sm border border-gray-100">
              <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto">
                <XCircle className="w-6 h-6 text-[#DC2626]" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">업체 등록 반려</h2>
              <p className="text-sm text-gray-500">
                {COMPANY_PENDING.REJECTED_NOTICE}
              </p>
              {name && (
                <p className="text-xs text-gray-400">업체명: {name}</p>
              )}
            </div>
          </div>
        </main>
      </div>
    )
  }

  // PENDING 상태: 레이아웃 리다이렉트 없이 children 렌더
  // /pending 페이지가 (company) 그룹 안에 있으므로 여기서 redirect("/pending")하면
  // 무한 루프가 발생한다. 대신 /pending 페이지 자체가 상태를 체크하고,
  // SOS/검색 Route Handler에서 requireApprovedCompany 호출로 API 레벨 차단.
  // APPROVED 및 PENDING 모두 children 렌더 (페이지별 자체 게이트)
  return (
    <div className="flex min-h-screen">
      <Sidebar role="COMPANY_OWNER" config={COMPANY_SIDEBAR_CONFIG} />
      <main className="flex-1 overflow-y-auto bg-gray-50">
        <div className="px-6 pt-[calc(1.5rem+3.5rem)] pb-6 lg:pt-8 lg:px-10 max-w-screen-2xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
