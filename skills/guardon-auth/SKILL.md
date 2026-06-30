---
name: guardon-auth
description: "GuardOn 인증 스킬. 카카오 OAuth 소셜 로그인, NextAuth v5 JWT 세션, COMPANY_OWNER/WORKER/ADMIN RBAC 미들웨어, 온보딩 역할 선택 및 개인정보 동의 저장, 업체·인력 회원가입 API를 구현한다."
---

# GuardOn — 인증 스킬 (Kakao OAuth + NextAuth v5 + RBAC)

## 목적
FR1~FR3, FR37, FR38을 구현한다.
- 카카오 소셜 로그인 (FR3)
- 업체 대표 회원가입 + 경비업 허가번호 검증 (FR1)
- 인력 회원가입 + 프로필 등록 (FR2)
- RBAC 미들웨어 (COMPANY_OWNER / WORKER / ADMIN 분기)
- 개인정보·위치·이용약관 동의 (FR37)

PRD 참조: `/G360/guardon-prd.md` — FR1~FR3, FR37~FR38, RBAC

---

## Step 1. NextAuth v5 설정

`src/lib/auth.ts`:
```typescript
import NextAuth from "next-auth"
import KakaoProvider from "next-auth/providers/kakao"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "./prisma"
import { UserRole } from "@prisma/client"

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    KakaoProvider({
      clientId: process.env.KAKAO_CLIENT_ID!,
      clientSecret: process.env.KAKAO_CLIENT_SECRET!,
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        // 최초 로그인 시 DB에서 role 조회
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
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
  pages: {
    signIn: "/login",
    error: "/login",
  },
})
```

---

## Step 2. TypeScript 타입 확장

`src/types/next-auth.d.ts`:
```typescript
import { UserRole } from "@prisma/client"
import { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      role: UserRole
    } & DefaultSession["user"]
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: UserRole
    userId?: string
  }
}
```

---

## Step 3. API Route Handler

`src/app/api/auth/[...nextauth]/route.ts`:
```typescript
import { handlers } from "@/lib/auth"
export const { GET, POST } = handlers
```

---

## Step 4. RBAC 미들웨어

`src/middleware.ts`:
```typescript
import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export default auth((req) => {
  const { pathname } = req.nextUrl
  const session = req.auth
  const role = session?.user?.role

  // 미인증 → 로그인 페이지
  if (!session) {
    return NextResponse.redirect(new URL("/login", req.url))
  }

  // 역할 기반 접근 제어
  if (pathname.startsWith("/admin") && role !== "ADMIN") {
    return NextResponse.redirect(new URL("/unauthorized", req.url))
  }
  if (pathname.startsWith("/company") && role !== "COMPANY_OWNER") {
    return NextResponse.redirect(new URL("/unauthorized", req.url))
  }
  if (pathname.startsWith("/worker") && role !== "WORKER") {
    return NextResponse.redirect(new URL("/unauthorized", req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ["/company/:path*", "/worker/:path*", "/admin/:path*"],
}
```

---

## Step 5. 카카오 로그인 페이지

`src/app/(auth)/login/page.tsx`:
```typescript
"use client"
import { signIn } from "next-auth/react"
import { useState } from "react"

export default function LoginPage() {
  const [loading, setLoading] = useState(false)

  const handleKakaoLogin = async () => {
    setLoading(true)
    await signIn("kakao", { callbackUrl: "/onboarding" })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-xl shadow">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">GuardOn</h1>
          <p className="mt-2 text-gray-600">경비 인력 매칭 플랫폼</p>
        </div>
        <button
          onClick={handleKakaoLogin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 py-3 px-4 
                     bg-[#FEE500] hover:bg-[#FDD835] text-gray-900 font-semibold 
                     rounded-lg transition-colors disabled:opacity-50"
        >
          {loading ? "로그인 중..." : "카카오로 시작하기"}
        </button>
      </div>
    </div>
  )
}
```

---

## Step 6. 온보딩 — 역할 선택 + 동의 (FR1, FR2, FR37)

`src/app/onboarding/page.tsx`:
```typescript
"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"

type Step = "role" | "consent" | "profile"

export default function OnboardingPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [step, setStep] = useState<Step>("role")
  const [selectedRole, setSelectedRole] = useState<"COMPANY_OWNER" | "WORKER" | null>(null)
  const [consent, setConsent] = useState({
    personalInfo: false,
    location: false,
    terms: false,
  })

  const handleRoleSelect = (role: "COMPANY_OWNER" | "WORKER") => {
    setSelectedRole(role)
    setStep("consent")
  }

  const handleConsentSubmit = async () => {
    if (!consent.personalInfo || !consent.location || !consent.terms) {
      alert("모든 항목에 동의해주세요.")
      return
    }

    await fetch("/api/auth/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: selectedRole, consent }),
    })

    setStep("profile")
  }

  const redirectAfterProfile = () => {
    if (selectedRole === "COMPANY_OWNER") router.push("/company/dashboard")
    else router.push("/worker/dashboard")
  }

  if (step === "role") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="max-w-md w-full p-8 space-y-6">
          <h2 className="text-2xl font-bold text-center">어떤 역할로 시작하시나요?</h2>
          <button
            onClick={() => handleRoleSelect("COMPANY_OWNER")}
            className="w-full py-4 border-2 border-blue-600 rounded-xl text-blue-600 
                       font-semibold hover:bg-blue-50 transition-colors"
          >
            경비업체 대표
            <p className="text-sm font-normal text-gray-500 mt-1">인력을 검색하고 SOS 요청을 보냅니다</p>
          </button>
          <button
            onClick={() => handleRoleSelect("WORKER")}
            className="w-full py-4 border-2 border-green-600 rounded-xl text-green-600 
                       font-semibold hover:bg-green-50 transition-colors"
          >
            인력 (경비원·경호원)
            <p className="text-sm font-normal text-gray-500 mt-1">프로필을 등록하고 SOS 요청을 수락합니다</p>
          </button>
        </div>
      </div>
    )
  }

  if (step === "consent") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="max-w-md w-full p-8 space-y-6">
          <h2 className="text-2xl font-bold">약관 동의</h2>
          {[
            { key: "personalInfo", label: "[필수] 개인정보 수집·이용 동의" },
            { key: "location", label: "[필수] 위치정보 수집·이용 동의" },
            { key: "terms", label: "[필수] 이용약관 동의" },
          ].map(({ key, label }) => (
            <label key={key} className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={consent[key as keyof typeof consent]}
                onChange={(e) =>
                  setConsent((prev) => ({ ...prev, [key]: e.target.checked }))
                }
                className="w-5 h-5"
              />
              <span>{label}</span>
            </label>
          ))}
          <button
            onClick={handleConsentSubmit}
            className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
          >
            동의하고 계속하기
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4">
        <h2 className="text-2xl font-bold">프로필을 등록해주세요</h2>
        <button
          onClick={redirectAfterProfile}
          className="py-3 px-6 bg-blue-600 text-white rounded-lg"
        >
          {selectedRole === "COMPANY_OWNER" ? "업체 정보 등록하기" : "인력 프로필 등록하기"}
        </button>
      </div>
    </div>
  )
}
```

---

## Step 7. 온보딩 API (역할 설정 + 동의 저장)

`src/app/api/auth/onboarding/route.ts`:
```typescript
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { role, consent } = await req.json()

  // 역할 설정
  await prisma.user.update({
    where: { id: session.user.id },
    data: { role },
  })

  // 동의 기록 (FR37)
  await prisma.consentLog.create({
    data: {
      userId: session.user.id,
      personalInfoConsent: consent.personalInfo,
      locationConsent: consent.location,
      termsConsent: consent.terms,
      ipAddress: req.headers.get("x-forwarded-for") ?? undefined,
    },
  })

  return NextResponse.json({ success: true })
}
```

---

## Step 8. 업체 등록 API (FR1, FR4)

`src/app/api/companies/register/route.ts`:
```typescript
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const CompanySchema = z.object({
  name: z.string().min(2),
  licenseNumber: z.string().regex(/^\d{2}-\d{6}$/), // 경비업 허가번호 형식
  address: z.string(),
  city: z.string(),
  district: z.string(),
  phone: z.string().regex(/^0\d{1,2}-\d{3,4}-\d{4}$/),
  description: z.string().optional(),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== "COMPANY_OWNER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json()
  const parsed = CompanySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors }, { status: 400 })
  }

  // 허가번호 중복 확인
  const existing = await prisma.company.findUnique({
    where: { licenseNumber: parsed.data.licenseNumber },
  })
  if (existing) {
    return NextResponse.json({ error: "이미 등록된 허가번호입니다." }, { status: 409 })
  }

  const company = await prisma.company.create({
    data: {
      ...parsed.data,
      ownerId: session.user.id,
      isActive: false, // 관리자 승인 후 활성화 (FR7)
    },
  })

  return NextResponse.json(company, { status: 201 })
}
```

---

## Step 9. 인력 프로필 등록 API (FR2, FR5, FR6)

`src/app/api/workers/register/route.ts`:
```typescript
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { WorkField } from "@prisma/client"

const WorkerSchema = z.object({
  workFields: z.array(z.nativeEnum(WorkField)).min(1),
  experienceYears: z.number().int().min(0).max(50),
  address: z.string(),
  city: z.string(),
  district: z.string(),
  latitude: z.number().min(33).max(39),   // 한국 위도 범위
  longitude: z.number().min(124).max(132), // 한국 경도 범위
  desiredHourlyRate: z.number().int().optional(),
  bio: z.string().max(500).optional(),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== "WORKER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json()
  const parsed = WorkerSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors }, { status: 400 })
  }

  const profile = await prisma.workerProfile.create({
    data: {
      ...parsed.data,
      userId: session.user.id,
      availability: "UNAVAILABLE",
    },
  })

  return NextResponse.json(profile, { status: 201 })
}
```

---

## 성공 기준
- 카카오 로그인 → JWT 발급 → 역할 선택 → 동의 저장까지 전체 플로우 에러 없음
- COMPANY_OWNER가 /worker 경로 접근 시 /unauthorized 리다이렉트
- 업체 등록 시 licenseNumber 중복 400 응답
- ConsentLog 테이블에 동의 기록 저장 확인
