import NextAuth from "next-auth"
import authConfig from "@/lib/auth.config"
import { getDevSessionFromRequest } from "@/lib/dev-auth"
import { NextResponse } from "next/server"
import type { UserRole } from "@prisma/client"

const { auth } = NextAuth(authConfig)

const isDev = process.env.NODE_ENV === "development"

// (admin), (company), (worker) 라우트 그룹 — URL에 그룹명 prefix 없음
// 각 그룹의 실제 URL 패턴으로 역할 보호
const ROLE_PATHS: Record<string, UserRole> = {
  // admin 전용 페이지
  "/members": "ADMIN",
  "/credentials": "ADMIN",
  "/sos-monitor": "ADMIN",
  "/stats": "ADMIN",
  // company 전용 페이지
  "/register": "COMPANY_OWNER",
  "/pending": "COMPANY_OWNER",
  "/sos": "COMPANY_OWNER",
  "/search": "COMPANY_OWNER",
  "/company-history": "COMPANY_OWNER",
  // worker 전용 페이지
  "/profile": "WORKER",
  "/my-credentials": "WORKER",
  "/notifications": "WORKER",
  "/worker-history": "WORKER",
}

function getRequiredRole(pathname: string): UserRole | null {
  for (const [prefix, role] of Object.entries(ROLE_PATHS)) {
    if (pathname.startsWith(prefix)) return role
  }
  return null
}

function buildCsp(nonce: string): string {
  return [
    "default-src 'self'",
    // Next.js App Router injects inline hydration scripts — they need the
    // per-request nonce to execute under CSP, otherwise React never hydrates
    // and forms/buttons silently fall back to native (non-JS) behavior.
    `script-src 'self' 'nonce-${nonce}'${isDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://kauth.kakao.com https://kapi.kakao.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ")
}

export default auth(async (req) => {
  const { pathname } = req.nextUrl

  const nonce = Buffer.from(crypto.randomUUID()).toString("base64")
  const csp = buildCsp(nonce)

  // 모든 요청에 x-pathname / x-nonce 헤더 주입
  // (x-pathname: 서버 컴포넌트에서 현재 경로 확인용, x-nonce: CSP 스크립트 허용용)
  const requestHeaders = new Headers(req.headers)
  requestHeaders.set("x-pathname", pathname)
  requestHeaders.set("x-nonce", nonce)
  requestHeaders.set("Content-Security-Policy", csp)

  const requiredRole = getRequiredRole(pathname)
  if (!requiredRole) {
    const res = NextResponse.next({ request: { headers: requestHeaders } })
    res.headers.set("Content-Security-Policy", csp)
    return res
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

  const res = NextResponse.next({ request: { headers: requestHeaders } })
  res.headers.set("Content-Security-Policy", csp)
  return res
})

export const config = {
  // _next 정적 파일·이미지·favicon 제외한 모든 경로에서 실행
  // x-pathname 헤더 주입이 목적이므로 범위를 넓게 설정
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/).*)"],
}
