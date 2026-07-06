"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Coins } from "lucide-react"

export type Role = "COMPANY_OWNER" | "WORKER" | "ADMIN"

interface NavLink {
  label: string
  href: string
}

const NAV_LINKS: Record<Role, NavLink[]> = {
  COMPANY_OWNER: [
    { label: "SOS 요청",      href: "/sos/new" },
    { label: "SOS 요청 현황", href: "/sos" },
    { label: "인력 검색",     href: "/search" },
    { label: "알림",          href: "/company-notifications" },
    { label: "포인트",        href: "/company-points" },
  ],
  WORKER: [
    { label: "내 프로필", href: "/profile" },
    { label: "알림",      href: "/notifications" },
    { label: "이력",      href: "/worker-history" },
    { label: "포인트",    href: "/my-points" },
  ],
  ADMIN: [
    { label: "대시보드",   href: "/" },
    { label: "업체 관리",  href: "/members" },
    { label: "자격증 심사", href: "/credentials" },
    { label: "포인트 관리", href: "/points" },
  ],
}

const ROLE_BADGE_LABELS: Record<Role, string> = {
  COMPANY_OWNER: "업체 대표",
  WORKER:        "경비 인력",
  ADMIN:         "관리자",
}

const ROLE_BADGE_COLORS: Record<Role, string> = {
  COMPANY_OWNER: "bg-blue-50 text-blue-700",
  WORKER:        "bg-green-50 text-green-700",
  ADMIN:         "bg-amber-50 text-amber-700",
}

export interface HeaderProps {
  role: Role
  unreadNotifications?: number
  pointBalance?: number
}

export function Header({ role, unreadNotifications = 0, pointBalance }: HeaderProps) {
  const pathname = usePathname()
  const links = NAV_LINKS[role]

  const isActive = (href: string) =>
    pathname === href || (href !== "/" && pathname?.startsWith(href + "/"))

  return (
    <header className="h-14 bg-white/95 backdrop-blur border-b border-gray-100 shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto h-full px-6 flex items-center justify-between gap-4">
        {/* 좌측: 로고 + 역할 배지 */}
        <div className="flex items-center gap-2 shrink-0">
          <Link href="/" className="text-lg font-bold text-brand">
            GuardOn
          </Link>
          <span
            className={cn(
              "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
              ROLE_BADGE_COLORS[role],
            )}
          >
            {ROLE_BADGE_LABELS[role]}
          </span>
        </div>

        {/* 중앙: 네비게이션 */}
        <nav className="flex items-center gap-1 flex-1 justify-center">
          {links.map((link) => {
            const isNotif = link.href === "/notifications" || link.href === "/company-notifications"
            const showBadge = isNotif && unreadNotifications > 0
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "relative px-4 py-2 rounded-lg text-sm transition-colors",
                  isActive(link.href)
                    ? "bg-gray-100 text-gray-900 font-semibold"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50",
                )}
              >
                {link.label}
                {showBadge && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center leading-none">
                    {unreadNotifications > 99 ? "99+" : unreadNotifications}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        {/* 우측: 포인트 잔액 + 역할 전환 */}
        <div className="flex items-center gap-2 shrink-0">
          {pointBalance !== undefined && (
            <Link
              href={role === "COMPANY_OWNER" ? "/company-points" : "/my-points"}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <Coins className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-xs font-bold text-gray-700">{pointBalance.toLocaleString()}P</span>
            </Link>
          )}
          <Link
            href="/dev-login"
            className="text-sm text-gray-500 hover:text-gray-900 transition-colors min-h-[36px] px-3 rounded-lg hover:bg-gray-50 inline-flex items-center"
          >
            역할 전환
          </Link>
        </div>
      </div>
    </header>
  )
}
