"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState, useRef, useEffect } from "react"
import { cn } from "@/lib/utils"
import { Coins, ChevronDown, User } from "lucide-react"

export type Role = "COMPANY_OWNER" | "WORKER" | "ADMIN"

interface NavLink {
  label: string
  href: string
}

const NAV_LINKS: Record<Role, NavLink[]> = {
  COMPANY_OWNER: [
    { label: "알림",              href: "/company-notifications" },
    { label: "SOS 긴급 요청",     href: "/sos/new" },
    { label: "SOS 긴급 요청 현황", href: "/sos" },
    { label: "인력 검색",          href: "/search" },
  ],
  WORKER: [
    { label: "알림",    href: "/notifications" },
    { label: "이력",    href: "/worker-history" },
    { label: "내 정보",  href: "/profile" },
    { label: "본인 인증", href: "/my-verification" },
  ],
  ADMIN: [
    { label: "대시보드",   href: "/" },
    { label: "업체 관리",  href: "/members" },
    { label: "자격증 심사", href: "/credentials" },
    { label: "포인트 관리", href: "/points" },
  ],
}

// 업체 대표 전용 "내 정보" 드롭다운 항목
const MY_INFO_LINKS: NavLink[] = [
  { label: "설정",      href: "/settings" },
  { label: "포인트",    href: "/company-points" },
  { label: "근로계약서", href: "/contracts" },
  { label: "신고 정보",  href: "/tax-reports" },
]

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
  const [myInfoOpen, setMyInfoOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const isActive = (href: string) =>
    pathname === href || (href !== "/" && pathname?.startsWith(href + "/"))

  const myInfoActive = MY_INFO_LINKS.some((l) => isActive(l.href))

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setMyInfoOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <header className="h-14 bg-white/95 backdrop-blur border-b border-gray-100 shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto h-full px-6 flex items-center justify-between gap-4">

        {/* 좌측: 로고 + 역할 배지 */}
        <div className="flex items-center gap-2 shrink-0">
          <Link href="/" className="text-lg font-bold text-brand">
            GuardOn
          </Link>
          <span className={cn(
            "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
            ROLE_BADGE_COLORS[role],
          )}>
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

          {/* 업체 대표 전용 "내 정보" 드롭다운 */}
          {role === "COMPANY_OWNER" && (
            <div ref={dropdownRef} className="relative">
              <button
                onClick={() => setMyInfoOpen((v) => !v)}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm transition-colors",
                  myInfoActive || myInfoOpen
                    ? "bg-gray-100 text-gray-900 font-semibold"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50",
                )}
              >
                <User className="w-3.5 h-3.5" />
                내 정보
                <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", myInfoOpen && "rotate-180")} />
              </button>

              {myInfoOpen && (
                <div className="absolute top-full left-0 mt-1 w-36 bg-white rounded-xl border border-gray-100 shadow-lg py-1 z-50">
                  {MY_INFO_LINKS.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMyInfoOpen(false)}
                      className={cn(
                        "block px-4 py-2 text-sm transition-colors",
                        isActive(link.href)
                          ? "bg-gray-50 text-gray-900 font-semibold"
                          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
                      )}
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </nav>

        {/* 우측: 포인트 잔액 + 역할 전환 */}
        <div className="flex items-center gap-2 shrink-0">
          {pointBalance !== undefined && role === "COMPANY_OWNER" && (
            <Link
              href="/company-points"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <Coins className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-xs font-bold text-gray-700">{pointBalance.toLocaleString()}P</span>
            </Link>
          )}
          {pointBalance !== undefined && role === "WORKER" && (
            <Link
              href="/my-points"
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
