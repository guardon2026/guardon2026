"use client"
import { useRouter } from "next/navigation"
import { Building2, UserCheck } from "lucide-react"
import { AUTH } from "@/lib/constants"

const ROLE_CARDS = [
  {
    role: "COMPANY_OWNER" as const,
    icon: Building2,
    bgColor: "bg-blue-50",
    iconColor: "text-brand",
    borderColor: "border-brand",
    title: AUTH.roleCompanyOwner,
    desc: AUTH.roleCompanyOwnerDesc,
  },
  {
    role: "WORKER" as const,
    icon: UserCheck,
    bgColor: "bg-green-50",
    iconColor: "text-green-600",
    borderColor: "border-green-500",
    title: AUTH.roleWorker,
    desc: AUTH.roleWorkerDesc,
  },
]

export default function OnboardingPage() {
  const router = useRouter()

  const handleRoleSelect = (role: "COMPANY_OWNER" | "WORKER") => {
    sessionStorage.setItem("pending_role", role)
    router.push("/consent")
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-1">
          <h2 className="text-2xl font-bold text-gray-900">{AUTH.onboardingTitle}</h2>
          <p className="text-sm text-gray-500">역할을 선택하면 맞춤 서비스를 이용하실 수 있습니다.</p>
        </div>

        <div className="grid gap-4">
          {ROLE_CARDS.map(({ role, icon: Icon, bgColor, iconColor, borderColor, title, desc }) => (
            <button
              key={role}
              onClick={() => handleRoleSelect(role)}
              className={`w-full bg-white rounded-2xl shadow-card border border-gray-100
                          p-6 text-left hover:border-current transition-all
                          hover:shadow-md group`}
            >
              <div className="flex items-start gap-4">
                <div className={`w-16 h-16 rounded-2xl ${bgColor} flex items-center justify-center shrink-0`}>
                  <Icon className={`w-8 h-8 ${iconColor}`} />
                </div>
                <div className="flex-1 pt-1">
                  <p className="text-lg font-bold text-gray-900">{title}</p>
                  <p className="text-sm text-gray-500 mt-1">{desc}</p>
                  <span
                    className={`inline-flex items-center mt-3 text-sm font-semibold ${iconColor} gap-1`}
                  >
                    선택하기 →
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
