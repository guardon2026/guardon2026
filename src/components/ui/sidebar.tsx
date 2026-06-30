"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { LogOut, Menu, X, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

export type Role = "COMPANY_OWNER" | "WORKER"

interface NavItem {
  href: string
  label: string
  icon: LucideIcon
}

interface RoleConfig {
  subtitle: string
  badgeLabel: string
  badgeClass: string
  items: NavItem[]
}

function SidebarContent({
  role,
  config,
  onClose,
}: {
  role: Role
  config: RoleConfig
  onClose?: () => void
}) {
  const pathname = usePathname()

  const isActive = (href: string) =>
    pathname === href || (href !== "/" && pathname?.startsWith(href + "/"))

  return (
    <div className="flex flex-col h-full">
      <div className="p-5 border-b border-gray-700/50 flex items-center justify-between">
        <div>
          <p className="text-lg font-bold text-white">GuardOn</p>
          <p className="text-xs text-gray-400 mt-0.5">{config.subtitle}</p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden p-1 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <nav className="flex-1 p-4 space-y-0.5 overflow-y-auto">
        {config.items.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
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
        ))}
      </nav>

      <div className="p-4 border-t border-gray-700/50 space-y-2">
        <div className="flex items-center gap-2 px-3 py-2">
          <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium", config.badgeClass)}>
            {config.badgeLabel}
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

export function Sidebar({ role, config }: { role: Role; config: RoleConfig }) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <>
      {/* 좁은 화면용 상단 바 (태블릿 이하) */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-gray-900 text-white flex items-center px-4 z-40 border-b border-gray-700/50">
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800/50 transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
        <span className="ml-3 text-base font-bold text-white">GuardOn</span>
        <span className="ml-2 text-xs text-gray-400">{config.subtitle}</span>
      </div>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <aside className="w-72 bg-gray-900 text-white flex flex-col shadow-2xl">
            <SidebarContent role={role} config={config} onClose={() => setMobileOpen(false)} />
          </aside>
          <div
            className="flex-1 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
        </div>
      )}

      {/* PC 고정 사이드바 */}
      <aside className="hidden lg:flex w-64 bg-gray-900 text-white flex-col min-h-screen shrink-0 sticky top-0">
        <SidebarContent role={role} config={config} />
      </aside>
    </>
  )
}
