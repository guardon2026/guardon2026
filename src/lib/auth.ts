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
      authorization: "https://kauth.kakao.com/oauth/authorize?scope=profile_nickname,profile_image,account_email",
    }),
  ],
  adapter: PrismaAdapter(prisma),
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        // 최초 로그인: DB에서 role 조회 (탈퇴 사용자 차단)
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id, deletedAt: null },
          select: { role: true, id: true },
        })
        token.role = dbUser?.role
        token.userId = dbUser?.id
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
