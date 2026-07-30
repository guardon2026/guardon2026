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
    async jwt({ token, user, trigger }) {
      if (user || trigger === "update") {
        const uid = (user?.id ?? token.userId) as string | undefined
        if (uid) {
          const dbUser = await prisma.user.findUnique({
            where: { id: uid, deletedAt: null },
            select: { role: true, id: true, name: true },
          })
          token.role = dbUser?.role
          token.userId = dbUser?.id
          token.name = dbUser?.name
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
    // 카카오 프로필 이름을 그대로 쓰지 않고 기본값으로 대체 — 이름은 프로필 수정에서 직접 설정
    async createUser({ user }) {
      await prisma.user.update({
        where: { id: user.id! },
        data: { name: "가드온 사용자" },
      })
    },
  },
})
