import type { UserRole } from "@prisma/client"
import type { Session } from "next-auth"
import type { NextRequest } from "next/server"

const VALID_ROLES: UserRole[] = ["COMPANY_OWNER", "WORKER", "ADMIN"]

// dev_user 쿠키로 명시된 경우 해당 ID/이름/이메일을 사용, 없으면 역할 기반 기본값
const DEV_USER_MAP: Record<string, { id: string; name: string; email: string; role: UserRole }> = {
  "dev-company_owner": { id: "dev-company_owner", name: "[DEV] 업체 대표",  email: "dev-company_owner@guardon.dev", role: "COMPANY_OWNER" },
  "dev-worker":        { id: "dev-worker",        name: "[DEV] 경비 인력",  email: "dev-worker@guardon.dev",        role: "WORKER" },
  "dev-worker2":       { id: "dev-worker2",       name: "[DEV] 경비 인력2", email: "dev-worker2@guardon.dev",       role: "WORKER" },
  "dev-admin":         { id: "dev-admin",          name: "[DEV] 관리자",     email: "dev-admin@guardon.dev",         role: "ADMIN" },
}

function buildMockSession(role: UserRole, userId?: string): Session {
  const override = userId ? DEV_USER_MAP[userId] : undefined
  const id    = override?.id    ?? `dev-${role.toLowerCase()}`
  const name  = override?.name  ?? `[DEV] ${role}`
  const email = override?.email ?? `dev-${role.toLowerCase()}@guardon.dev`
  return {
    user: { id, name, email, image: null, role },
    expires: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
  }
}

/**
 * 미들웨어용 (Edge Runtime): NextRequest 에서 dev_role 쿠키를 읽는다.
 * 프로덕션에서는 항상 null 반환.
 */
export function getDevSessionFromRequest(req: NextRequest): Session | null {
  if (process.env.NODE_ENV === "production") return null
  const role   = req.cookies.get("dev_role")?.value as UserRole | undefined
  const userId = req.cookies.get("dev_user")?.value
  if (!role || !VALID_ROLES.includes(role)) return null
  return buildMockSession(role, userId)
}

/**
 * 서버 컴포넌트·Route Handler 용: next/headers cookies() 사용.
 * 프로덕션에서는 항상 null 반환.
 */
export async function getDevSessionServer(): Promise<Session | null> {
  if (process.env.NODE_ENV === "production") return null
  const { cookies } = await import("next/headers")
  const cookieStore = await cookies()
  const role   = cookieStore.get("dev_role")?.value as UserRole | undefined
  const userId = cookieStore.get("dev_user")?.value
  if (!role || !VALID_ROLES.includes(role)) return null
  return buildMockSession(role, userId)
}
