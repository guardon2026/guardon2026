import NextAuth from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import Kakao from "next-auth/providers/kakao"
import { prisma } from "./prisma"
import { UserRole } from "@prisma/client"
import authConfig from "./auth.config"

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  debug: true,
  providers: [
    Kakao({
      clientId: process.env.KAKAO_CLIENT_ID!,
      clientSecret: process.env.KAKAO_CLIENT_SECRET ?? "",
    }),
  ],
  adapter: PrismaAdapter(prisma),
  callbacks: {
    async jwt({ token, user }) {
      // 최초 로그인 또는 role이 미설정 상태(consent 직후)일 때 DB에서 role 조회
      if (user || !token.role) {
        const uid = (user?.id ?? token.userId) as string | undefined
        if (uid) {
          const dbUser = await prisma.user.findUnique({
            where: { id: uid, deletedAt: null },
            select: { role: true, id: true },
          })
          token.role = dbUser?.role
          token.userId = dbUser?.id
        }
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.role = token.role as UserRole
        session.user.id = token.userId as string
      }
      return session
    },
  },
  events: {
    // Kakao 최초 가입 시 name 이 null 이면 기본값 설정
    async createUser({ user }) {
      if (!user.name) {
        await prisma.user.update({
          where: { id: user.id! },
          data: { name: "카카오 사용자" },
        })
      }
    },
  },
})
