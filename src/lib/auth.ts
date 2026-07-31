import NextAuth from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import Kakao from "next-auth/providers/kakao"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
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
    // 관리자 전용 이메일+비밀번호 로그인 — 카카오 계정과 무관하게 role=ADMIN 계정만 허용
    Credentials({
      id: "admin-credentials",
      name: "Admin",
      credentials: {
        email: { label: "이메일", type: "email" },
        password: { label: "비밀번호", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email
        const password = credentials?.password
        if (typeof email !== "string" || typeof password !== "string" || !email || !password) {
          return null
        }

        const user = await prisma.user.findUnique({
          where: { email, deletedAt: null },
          select: { id: true, email: true, name: true, role: true, password: true },
        })
        if (!user || user.role !== "ADMIN" || !user.password) return null

        const valid = await bcrypt.compare(password, user.password)
        if (!valid) return null

        return { id: user.id, email: user.email, name: user.name }
      },
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
