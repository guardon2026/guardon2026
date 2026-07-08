import NextAuth from "next-auth"
import authConfig from "@/lib/auth.config"
import { getDevSessionFromRequest } from "@/lib/dev-auth"
import { NextResponse } from "next/server"
import type { UserRole } from "@prisma/client"

const { auth } = NextAuth(authConfig)

// (admin), (company), (worker) 라우트 그룹 — URL에 그룹명 prefix 없음
// 각 그룹의 실제 URL 패턴으로 역할 보호
const ROLE_PATHS: Record<string, UserRole> = {
  // admin 전용 페이지
  "/members": "ADMIN",
  "/credentials": "ADMIN",
  "/sos-monitor": "ADMIN",
  "/reports": "ADMIN",
  "/stats": "ADMIN",
  // company 전용 페이지
  "/register": "COMPANY_OWNER",
  "/pending": "COMPANY_OWNER",
  "/search": "COMPANY_OWNER",
  "/company-history": "COMPANY_OWNER",
  // worker 전용 페이지
  "/profile": "WORKER",
  "/my-credentials": "WORKER",
  "/notifications": "WORKER",
  "/worker-history": "WORKER",
}

function getRequiredRole(pathname: string): UserRole | null {
  if (pathname === "/sos/new" || pathname.startsWith("/sos/new/") || pathname.endsWith("/edit")) {
    return "COMPANY_OWNER"
  }
  for (const [prefix, role] of Object.entries(ROLE_PATHS)) {
    if (pathname === prefix || pathname.startsWith(prefix + "/")) return role
  }
  return null
}

export default auth(async (req) => {
  const { pathname } = req.nextUrl

  // 모든 요청에 x-pathname 헤더 주입 (서버 컴포넌트에서 현재 경로 확인용)
  const requestHeaders = new Headers(req.headers)
  requestHeaders.set("x-pathname", pathname)

  const requiredRole = getRequiredRole(pathname)
  if (!requiredRole) {
    return NextResponse.next({ request: { headers: requestHeaders } })
  }

  // 1. 개발 환경: dev_role 쿠키 우선 확인
  const devSession = getDevSessionFromRequest(req)
  const session = devSession ?? req.auth

  // 2. 미인증 → 로그인 리다이렉트 (callbackUrl 포함)
  if (!session) {
    const loginUrl = new URL("/login", req.url)
    loginUrl.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(loginUrl)
  }

  // 3. 역할 검사
  const role = session.user?.role
  if (role !== requiredRole) {
    return NextResponse.redirect(new URL("/unauthorized", req.url))
  }

  return NextResponse.next({ request: { headers: requestHeaders } })
})

export const config = {
  // _next 정적 파일·이미지·favicon 제외한 모든 경로에서 실행
  // x-pathname 헤더 주입이 목적이므로 범위를 넓게 설정
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/).*)"],
}
