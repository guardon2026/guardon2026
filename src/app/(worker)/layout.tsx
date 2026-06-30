import { Bell, History, User } from "lucide-react"
import { Sidebar } from "@/components/ui/sidebar"

const WORKER_SIDEBAR_CONFIG = {
  subtitle: "경비 인력 콘솔",
  badgeLabel: "경비 인력",
  badgeClass: "bg-green-500/20 text-green-300",
  items: [
    { href: "/profile", label: "내 프로필", icon: User },
    { href: "/notifications", label: "알림", icon: Bell },
    { href: "/worker-history", label: "이력", icon: History },
  ],
}

export default function WorkerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar role="WORKER" config={WORKER_SIDEBAR_CONFIG} />
      <main className="flex-1 overflow-y-auto bg-gray-50">
        <div className="px-6 pt-[calc(1.5rem+3.5rem)] pb-6 lg:pt-8 lg:px-10 max-w-screen-2xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
