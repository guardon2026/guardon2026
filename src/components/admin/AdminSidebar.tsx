"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Building2,
  FileCheck2,
  Zap,
  BarChart3,
  LogOut,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface NavItem {
  href: string
  label: string
  icon: React.ElementType
}

const navSections: { title: string; items: NavItem[] }[] = [
  {
    title: "개요",
    items: [
      { href: "/", label: "대시보드", icon: LayoutDashboard },
    ],
  },
  {
    title: "회원 관리",
    items: [
      { href: "/members", label: "업체 관리", icon: Building2 },
    ],
  },
  {
    title: "콘텐츠",
    items: [
      { href: "/credentials", label: "자격증 심사", icon: FileCheck2 },
    ],
  },
  {
    title: "운영",
    items: [
      { href: "/sos-monitor", label: "SOS 모니터", icon: Zap },
      { href: "/stats", label: "통계", icon: BarChart3 },
    ],
  },
]

export function AdminSidebar() {
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/"
    return pathname.startsWith(href)
  }

  return (
    <aside className="w-64 bg-gray-900 text-white flex flex-col min-h-screen shrink-0">
      {/* 로고 영역 */}
      <div className="p-5 border-b border-gray-700/50">
        <Link href="/" className="text-lg font-bold text-white hover:text-gray-200 transition-colors">GuardOn</Link>
        <p className="text-xs text-gray-400 mt-0.5">관리자 콘솔</p>
      </div>

      {/* 네비게이션 */}
      <nav className="flex-1 p-4 space-y-6 overflow-y-auto">
        {navSections.map((section) => (
          <div key={section.title}>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 mb-1">
              {section.title}
            </p>
            <ul className="space-y-0.5">
              {section.items.map(({ href, label, icon: Icon }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                      isActive(href)
                        ? "bg-gray-800 text-white"
                        : "text-gray-400 hover:text-white hover:bg-gray-800/50"
                    )}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* 하단: 역할 배지 + 역할 전환 */}
      <div className="p-4 border-t border-gray-700/50 space-y-2">
        <div className="flex items-center gap-2 px-3 py-2">
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-brand/20 text-blue-300">
            ADMIN
          </span>
          <span className="text-xs text-gray-500">개발 모드</span>
        </div>
        <Link
          href="/dev-login"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-800/50 transition-colors"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          역할 전환
        </Link>
      </div>
    </aside>
  )
}
