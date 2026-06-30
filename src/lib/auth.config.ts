/**
 * Edge-compatible NextAuth config — providers 없음 (KakaoProvider는 Node 전용)
 * middleware에서 JWT 검증 시 NEXTAUTH_SECRET만 필요하므로 providers 불필요.
 * providers는 auth.ts에서만 선언.
 */
import type { NextAuthConfig } from "next-auth"

const authConfig: NextAuthConfig = {
  providers: [], // Edge에서는 provider 불필요 — JWT 검증만 수행
  session: { strategy: "jwt" },
  callbacks: {
    async session({ session, token }) {
      if (token) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        session.user.role = token.role as any
        session.user.id = token.userId as string
      }
      return session
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
}

export default authConfig
