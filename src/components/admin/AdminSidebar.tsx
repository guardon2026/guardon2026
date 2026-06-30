"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Building2,
  FileCheck2,
  Zap,
  BarChart3,
  LogOut,
  Menu,
  X,
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

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/"
    return pathname.startsWith(href)
  }

  return (
    <div className="flex flex-col h-full">
      {/* 로고 영역 */}
      <div className="p-5 border-b border-gray-700/50 flex items-center justify-between">
        <div>
          <p className="text-lg font-bold text-white">GuardOn</p>
          <p className="text-xs text-gray-400 mt-0.5">관리자 콘솔</p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="md:hidden p-1 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
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
                    onClick={onClose}
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

      {/* 하단: 역할 배지 + 로그아웃 */}
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
    </div>
  )
}

export function AdminSidebar() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <>
      {/* 모바일 상단 바 */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-gray-900 text-white flex items-center px-4 z-40 border-b border-gray-700/50">
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800/50 transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
        <span className="ml-3 text-base font-bold text-white">GuardOn</span>
        <span className="ml-2 text-xs text-gray-400">관리자 콘솔</span>
      </div>

      {/* 모바일 드로어 오버레이 */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <aside className="w-72 bg-gray-900 text-white flex flex-col shadow-2xl">
            <SidebarContent onClose={() => setMobileOpen(false)} />
          </aside>
          <div
            className="flex-1 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
        </div>
      )}

      {/* 데스크톱 사이드바 */}
      <aside className="hidden md:flex w-64 bg-gray-900 text-white flex-col min-h-screen shrink-0">
        <SidebarContent />
      </aside>
    </>
  )
}
