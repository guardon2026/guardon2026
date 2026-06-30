import type { UserRole } from "@prisma/client"
import type { Session } from "next-auth"
import type { NextRequest } from "next/server"

const VALID_ROLES: UserRole[] = ["COMPANY_OWNER", "WORKER", "ADMIN"]

function buildMockSession(role: UserRole): Session {
  return {
    user: {
      id: `dev-${role.toLowerCase()}`,
      name: `[DEV] ${role}`,
      email: `dev-${role.toLowerCase()}@guardon.dev`,
      image: null,
      role,
    },
    expires: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
  }
}

/**
 * 미들웨어용 (Edge Runtime): NextRequest 에서 dev_role 쿠키를 읽는다.
 * 프로덕션에서는 항상 null 반환.
 */
export function getDevSessionFromRequest(req: NextRequest): Session | null {
  if (process.env.NODE_ENV === "production") return null
  const role = req.cookies.get("dev_role")?.value as UserRole | undefined
  if (!role || !VALID_ROLES.includes(role)) return null
  return buildMockSession(role)
}

/**
 * 서버 컴포넌트·Route Handler 용: next/headers cookies() 사용.
 * 프로덕션에서는 항상 null 반환.
 */
export async function getDevSessionServer(): Promise<Session | null> {
  if (process.env.NODE_ENV === "production") return null
  const { cookies } = await import("next/headers")
  const cookieStore = await cookies()
  const role = cookieStore.get("dev_role")?.value as UserRole | undefined
  if (!role || !VALID_ROLES.includes(role)) return null
  return buildMockSession(role)
}
