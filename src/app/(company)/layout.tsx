import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { XCircle } from "lucide-react"
import { getServerSession } from "@/lib/session"
import { Header } from "@/components/ui/header"
import { getCompanyStatus } from "@/lib/company-gate"
import { COMPANY_PENDING } from "@/lib/constants"

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
      <div className="min-h-screen bg-gray-50">
        <Header role="COMPANY_OWNER" />
        <main className="max-w-7xl mx-auto px-4 py-6">
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
    <div className="min-h-screen bg-gray-50">
      <Header role="COMPANY_OWNER" />
      <main className="max-w-7xl mx-auto px-4 py-6">{children}</main>
    </div>
  )
}
