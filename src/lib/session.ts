import { auth } from "@/lib/auth"
import { getDevSessionServer } from "@/lib/dev-auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import type { UserRole } from "@prisma/client"
import type { Session } from "next-auth"

/**
 * 서버 컴포넌트·Route Handler 에서 현재 세션을 가져온다.
 * 개발 환경에서 dev_role 쿠키가 있으면 mock 세션을 우선 반환한다.
 */
export async function getServerSession(): Promise<Session | null> {
  const devSession = await getDevSessionServer()
  if (devSession) return devSession
  return auth()
}

/**
 * 역할 검사. 올바른 역할이 아니면 /unauthorized 로 리다이렉트한다.
 * 서버 컴포넌트 최상단에서 호출한다.
 *
 * @example
 * // app/(company)/dashboard/page.tsx
 * await requireRole("COMPANY_OWNER")
 */
export async function requireRole(role: UserRole): Promise<Session> {
  const session = await getServerSession()
  if (!session) redirect("/login")
  if (session.user.role !== role) redirect("/unauthorized")
  return session
}

/**
 * 세션의 userId 로 DB 사용자를 조회한다.
 * 탈퇴(softDelete) 사용자는 null 반환.
 */
export async function getCurrentUser() {
  const session = await getServerSession()
  if (!session?.user?.id) return null

  // dev mock 세션은 실제 DB 레코드가 없으므로 null 반환
  if (session.user.id.startsWith("dev-")) return null

  return prisma.user.findUnique({
    where: { id: session.user.id, deletedAt: null },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      kakaoId: true,
      createdAt: true,
      // deletedAt 은 의도적으로 제외
    },
  })
}
