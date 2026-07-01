import { notFound, redirect } from "next/navigation"
import { cookies } from "next/headers"
import { Building2, UserCheck, Shield, ChevronRight } from "lucide-react"
import { AUTH } from "@/lib/constants"

const ROLE_REDIRECT: Record<string, string> = {
  COMPANY_OWNER: "/sos/new",
  WORKER: "/profile",
  ADMIN: "/",
}

const ROLE_CONFIG = [
  {
    role: "COMPANY_OWNER" as const,
    label: AUTH.devRoleCompanyOwner,
    desc: "SOS 요청·인력 검색·매칭 관리",
    icon: Building2,
  },
  {
    role: "WORKER" as const,
    label: AUTH.devRoleWorker,
    desc: "프로필·자격증·알림 관리",
    icon: UserCheck,
  },
  {
    role: "ADMIN" as const,
    label: AUTH.devRoleAdmin,
    desc: "업체 심사·자격증 승인·통계",
    icon: Shield,
  },
] as const

export default async function DevLoginPage() {
  if (process.env.NODE_ENV !== "development") {
    notFound()
  }

  async function setDevRole(formData: FormData) {
    "use server"
    const role = formData.get("role") as string
    const cookieStore = await cookies()
    if (role === "logout") {
      cookieStore.delete("dev_role")
      redirect("/dev-login")
    } else {
      cookieStore.set("dev_role", role, {
        httpOnly: false,
        path: "/",
        maxAge: 60 * 60 * 24,
        sameSite: "lax",
      })
      redirect(ROLE_REDIRECT[role] ?? "/")
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm">
        {/* DEV 배너 */}
        <div className="flex justify-center mb-4">
          <span className="bg-amber-500 text-white text-xs font-bold px-3 py-1 rounded-full tracking-wide">
            DEV ONLY
          </span>
        </div>

        <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-8 space-y-6">
          <div className="text-center space-y-1">
            <h1 className="text-xl font-bold text-gray-900">{AUTH.devLoginTitle}</h1>
            <p className="text-sm text-gray-500">{AUTH.devLoginDesc}</p>
          </div>

          <form action={setDevRole} className="space-y-3">
            {ROLE_CONFIG.map(({ role, label, desc, icon: Icon }) => (
              <button
                key={role}
                type="submit"
                name="role"
                value={role}
                className="w-full flex items-center gap-3 px-4 py-3 border border-brand
                           rounded-xl text-left hover:bg-blue-50 transition-colors group"
              >
                <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                  <Icon className="w-4.5 h-4.5 text-brand" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 shrink-0 group-hover:text-brand transition-colors" />
              </button>
            ))}

            <div className="pt-2 border-t border-gray-100">
              <button
                type="submit"
                name="role"
                value="logout"
                className="w-full py-2.5 border border-gray-200 rounded-xl text-gray-500
                           text-sm hover:bg-gray-50 transition-colors"
              >
                {AUTH.devRoleReset}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
