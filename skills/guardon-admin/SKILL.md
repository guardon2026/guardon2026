---
name: guardon-admin
description: "GuardOn 관리자 대시보드 스킬. 업체 승인/반려, 자격증 심사(승인·반려·사유 입력), 회원 관리, SOS 실시간 모니터(최근 7일), 통계 페이지(성공률 자동 계산), 관리자 시드 데이터를 구현한다."
---

# GuardOn — 관리자 대시보드 스킬

## 목적
FR7, FR32~FR36을 구현한다.
- 업체 승인/반려 (FR7, FR32)
- 자격증 심사 (FR8~FR10, FR33)
- 회원 관리 (FR34)
- SOS 모니터링 (FR35)
- 통계 대시보드 (FR36)

PRD 참조: `/G360/guardon-prd.md` — FR7, FR32~FR36, NFR-S3

---

## 접근 제어

모든 `/admin/*` 경로는 `src/middleware.ts`에서 `ADMIN` 역할만 허용.
관리자 계정은 `prisma/seed.ts`에서 수동 생성 (`role: "ADMIN"`).

---

## Step 1. 관리자 레이아웃

`src/app/admin/layout.tsx`:
```typescript
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session || session.user.role !== "ADMIN") redirect("/login")

  const navItems = [
    { href: "/admin", label: "대시보드" },
    { href: "/admin/companies", label: "업체 관리" },
    { href: "/admin/credentials", label: "자격증 심사" },
    { href: "/admin/members", label: "회원 관리" },
    { href: "/admin/sos-monitor", label: "SOS 모니터" },
    { href: "/admin/stats", label: "통계" },
  ]

  return (
    <div className="flex min-h-screen">
      <aside className="w-56 bg-gray-900 text-white flex flex-col">
        <div className="p-4 border-b border-gray-700">
          <h1 className="font-bold text-lg">GuardOn Admin</h1>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="block px-3 py-2 rounded-lg text-gray-300 hover:bg-gray-700 
                         hover:text-white transition-colors text-sm"
            >
              {label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="flex-1 bg-gray-50 p-8">{children}</main>
    </div>
  )
}
```

---

## Step 2. 관리자 대시보드 홈

`src/app/admin/page.tsx`:
```typescript
import { prisma } from "@/lib/prisma"

export default async function AdminDashboard() {
  const [
    pendingCompanies,
    pendingCredentials,
    activeWorkers,
    activeSos,
    todayMatches,
  ] = await Promise.all([
    prisma.company.count({ where: { isActive: false, licenseVerified: false } }),
    prisma.workerCredential.count({ where: { status: "PENDING" } }),
    prisma.workerProfile.count({ where: { availability: "AVAILABLE" } }),
    prisma.sosRequest.count({ where: { status: { in: ["DISPATCHING", "PENDING"] } } }),
    prisma.matchHistory.count({
      where: {
        createdAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      },
    }),
  ])

  const stats = [
    { label: "승인 대기 업체", value: pendingCompanies, color: "bg-yellow-100 text-yellow-800" },
    { label: "심사 대기 자격증", value: pendingCredentials, color: "bg-orange-100 text-orange-800" },
    { label: "가용 인력", value: activeWorkers, color: "bg-green-100 text-green-800" },
    { label: "진행 중 SOS", value: activeSos, color: "bg-red-100 text-red-800" },
    { label: "오늘 매칭", value: todayMatches, color: "bg-blue-100 text-blue-800" },
  ]

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">대시보드</h2>
      <div className="grid grid-cols-5 gap-4">
        {stats.map(({ label, value, color }) => (
          <div key={label} className={`rounded-xl p-5 ${color}`}>
            <p className="text-3xl font-bold">{value}</p>
            <p className="text-sm mt-1">{label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
```

---

## Step 3. 업체 승인 페이지 (FR7, FR32)

`src/app/admin/companies/page.tsx`:
```typescript
import { prisma } from "@/lib/prisma"
import { CompanyApprovalTable } from "@/components/admin/CompanyApprovalTable"

export default async function AdminCompaniesPage() {
  const companies = await prisma.company.findMany({
    include: { owner: { select: { name: true, phone: true, email: true } } },
    orderBy: { createdAt: "desc" },
  })

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">업체 관리</h2>
      <CompanyApprovalTable companies={companies} />
    </div>
  )
}
```

`src/components/admin/CompanyApprovalTable.tsx`:
```typescript
"use client"
import { useState } from "react"

interface Company {
  id: string
  name: string
  licenseNumber: string
  licenseVerified: boolean
  isActive: boolean
  address: string
  phone: string
  createdAt: Date
  owner: { name: string; phone: string; email?: string | null }
}

export function CompanyApprovalTable({ companies }: { companies: Company[] }) {
  const [processing, setProcessing] = useState<string | null>(null)
  const [localCompanies, setLocalCompanies] = useState(companies)

  const handleApprove = async (companyId: string, approve: boolean) => {
    setProcessing(companyId)
    try {
      await fetch(`/api/admin/companies/${companyId}/approve`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approve }),
      })
      setLocalCompanies((prev) =>
        prev.map((c) =>
          c.id === companyId
            ? { ...c, isActive: approve, licenseVerified: approve }
            : c
        )
      )
    } finally {
      setProcessing(null)
    }
  }

  return (
    <div className="bg-white rounded-xl shadow overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {["업체명", "허가번호", "대표자", "등록일", "상태", "액션"].map((h) => (
              <th
                key={h}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {localCompanies.map((company) => (
            <tr key={company.id}>
              <td className="px-6 py-4 text-sm font-medium">{company.name}</td>
              <td className="px-6 py-4 text-sm text-gray-500">{company.licenseNumber}</td>
              <td className="px-6 py-4 text-sm">
                {company.owner.name}
                <br />
                <span className="text-gray-400 text-xs">{company.owner.phone}</span>
              </td>
              <td className="px-6 py-4 text-sm text-gray-500">
                {new Date(company.createdAt).toLocaleDateString("ko-KR")}
              </td>
              <td className="px-6 py-4">
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                    company.isActive
                      ? "bg-green-100 text-green-700"
                      : "bg-yellow-100 text-yellow-700"
                  }`}
                >
                  {company.isActive ? "승인됨" : "심사 중"}
                </span>
              </td>
              <td className="px-6 py-4 space-x-2">
                {!company.isActive && (
                  <>
                    <button
                      onClick={() => handleApprove(company.id, true)}
                      disabled={processing === company.id}
                      className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50"
                    >
                      승인
                    </button>
                    <button
                      onClick={() => handleApprove(company.id, false)}
                      disabled={processing === company.id}
                      className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50"
                    >
                      반려
                    </button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

---

## Step 4. 업체 승인 API (FR32)

`src/app/api/admin/companies/[id]/approve/route.ts`:
```typescript
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { approve } = await req.json()

  const company = await prisma.company.update({
    where: { id: params.id },
    data: {
      isActive: approve,
      licenseVerified: approve,
    },
  })

  return NextResponse.json(company)
}
```

---

## Step 5. 자격증 심사 페이지 (FR33)

`src/app/admin/credentials/page.tsx`:
```typescript
import { prisma } from "@/lib/prisma"
import { CredentialReviewList } from "@/components/admin/CredentialReviewList"

export default async function AdminCredentialsPage() {
  const pendingCredentials = await prisma.workerCredential.findMany({
    where: { status: "PENDING" },
    include: {
      workerProfile: {
        include: { user: { select: { name: true, phone: true } } },
      },
    },
    orderBy: { createdAt: "asc" }, // FIFO 처리
  })

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">
        자격증 심사{" "}
        <span className="text-base font-normal text-gray-500">
          ({pendingCredentials.length}건 대기)
        </span>
      </h2>
      <CredentialReviewList credentials={pendingCredentials} />
    </div>
  )
}
```

`src/components/admin/CredentialReviewList.tsx`:
```typescript
"use client"
import { useState } from "react"

const CREDENTIAL_LABELS: Record<string, string> = {
  SECURITY_INSTRUCTOR: "경비지도사",
  BODYGUARD: "신변보호사",
  SECURITY_TRAINING: "신임경비교육이수",
  SPECIAL_SECURITY: "특수경비원",
  CIVIL_POLICE: "청원경찰",
  KRAV_MAGA: "크라브마가",
}

export function CredentialReviewList({ credentials }: { credentials: any[] }) {
  const [processing, setProcessing] = useState<string | null>(null)
  const [rejectionReason, setRejectionReason] = useState("")
  const [activeReject, setActiveReject] = useState<string | null>(null)

  const handleDecision = async (
    credentialId: string,
    approve: boolean,
    reason?: string
  ) => {
    setProcessing(credentialId)
    try {
      await fetch(`/api/admin/credentials/${credentialId}/review`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approve, rejectionReason: reason }),
      })
      window.location.reload()
    } finally {
      setProcessing(null)
      setActiveReject(null)
      setRejectionReason("")
    }
  }

  return (
    <div className="space-y-4">
      {credentials.map((cred) => (
        <div key={cred.id} className="bg-white rounded-xl shadow p-6">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-lg">
                {CREDENTIAL_LABELS[cred.type] ?? cred.type}
              </h3>
              <p className="text-gray-600 text-sm mt-1">
                {cred.workerProfile.user.name} · {cred.workerProfile.user.phone}
              </p>
              <p className="text-gray-400 text-xs mt-1">
                제출: {new Date(cred.createdAt).toLocaleString("ko-KR")}
              </p>
            </div>
            <a
              href={cred.documentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
            >
              서류 확인
            </a>
          </div>

          {activeReject === cred.id ? (
            <div className="mt-4 space-y-3">
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="반려 사유를 입력하세요..."
                className="w-full border rounded-lg p-3 text-sm"
                rows={3}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => handleDecision(cred.id, false, rejectionReason)}
                  disabled={!rejectionReason.trim() || processing === cred.id}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm disabled:opacity-50"
                >
                  반려 확정
                </button>
                <button
                  onClick={() => setActiveReject(null)}
                  className="px-4 py-2 border rounded-lg text-sm"
                >
                  취소
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => handleDecision(cred.id, true)}
                disabled={processing === cred.id}
                className="px-5 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50"
              >
                승인
              </button>
              <button
                onClick={() => setActiveReject(cred.id)}
                disabled={processing === cred.id}
                className="px-5 py-2 bg-red-100 text-red-700 rounded-lg text-sm hover:bg-red-200 disabled:opacity-50"
              >
                반려
              </button>
            </div>
          )}
        </div>
      ))}

      {credentials.length === 0 && (
        <div className="text-center py-12 text-gray-400">심사 대기 자격증이 없습니다.</div>
      )}
    </div>
  )
}
```

---

## Step 6. 자격증 심사 API (FR33, FR9, FR10)

`src/app/api/admin/credentials/[id]/review/route.ts`:
```typescript
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { sendCredentialResult } from "@/lib/kakao"

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { approve, rejectionReason, adminNote } = await req.json()

  const credential = await prisma.workerCredential.update({
    where: { id: params.id },
    data: {
      status: approve ? "APPROVED" : "REJECTED",
      approvedAt: approve ? new Date() : null,
      rejectedAt: approve ? null : new Date(),
      rejectionReason: approve ? null : rejectionReason,
      adminNote,
    },
    include: { workerProfile: { select: { userId: true } } },
  })

  // 자격증 결과 알림 발송 (FR9)
  await sendCredentialResult(
    credential.workerProfile.userId,
    credential.type,
    approve,
    rejectionReason
  )

  return NextResponse.json(credential)
}
```

---

## Step 7. SOS 실시간 모니터 (FR35)

`src/app/admin/sos-monitor/page.tsx`:
```typescript
import { prisma } from "@/lib/prisma"
import { format } from "date-fns"
import { ko } from "date-fns/locale"

const STATUS_LABELS: Record<string, string> = {
  DISPATCHING: "발송 중",
  PENDING: "수락 대기",
  CONFIRMED: "확정됨",
  UNRESOLVED: "미해결",
  CANCELLED: "취소됨",
  COMPLETED: "완료됨",
}

const STATUS_COLORS: Record<string, string> = {
  DISPATCHING: "bg-blue-100 text-blue-800",
  PENDING: "bg-yellow-100 text-yellow-800",
  CONFIRMED: "bg-green-100 text-green-800",
  UNRESOLVED: "bg-red-100 text-red-800",
  CANCELLED: "bg-gray-100 text-gray-800",
  COMPLETED: "bg-gray-100 text-gray-800",
}

export default async function SosMonitorPage() {
  const sosList = await prisma.sosRequest.findMany({
    where: {
      createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }, // 최근 7일
    },
    include: {
      company: { select: { name: true } },
      responses: { select: { status: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">SOS 모니터 (최근 7일)</h2>
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {["업체", "제목", "일시", "필요인원", "수락", "상태", "반경"].map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {sosList.map((sos) => {
              const acceptedCount = sos.responses.filter(
                (r) => r.status === "ACCEPTED" || r.status === "CONFIRMED"
              ).length

              return (
                <tr key={sos.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm">{sos.company.name}</td>
                  <td className="px-4 py-3 text-sm font-medium">{sos.title}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {format(sos.scheduledAt, "M/d HH:mm", { locale: ko })}
                  </td>
                  <td className="px-4 py-3 text-sm text-center">{sos.requiredCount}</td>
                  <td className="px-4 py-3 text-sm text-center">
                    <span
                      className={acceptedCount >= sos.requiredCount ? "text-green-600 font-medium" : "text-gray-500"}
                    >
                      {acceptedCount}/{sos.requiredCount}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[sos.status]}`}
                    >
                      {STATUS_LABELS[sos.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{sos.radiusKm}km</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

---

## Step 8. 통계 페이지 (FR36)

`src/app/admin/stats/page.tsx`:
```typescript
import { prisma } from "@/lib/prisma"

export default async function StatsPage() {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const [
    totalCompanies,
    activeCompanies,
    totalWorkers,
    availableWorkers,
    monthlyMatches,
    monthlyUnresolved,
    totalMatches,
  ] = await Promise.all([
    prisma.company.count(),
    prisma.company.count({ where: { isActive: true } }),
    prisma.workerProfile.count(),
    prisma.workerProfile.count({ where: { availability: "AVAILABLE" } }),
    prisma.matchHistory.count({ where: { createdAt: { gte: startOfMonth } } }),
    prisma.sosRequest.count({
      where: { status: "UNRESOLVED", createdAt: { gte: startOfMonth } },
    }),
    prisma.matchHistory.count(),
  ])

  const monthlyTotal = monthlyMatches + monthlyUnresolved
  const successRate = monthlyTotal > 0
    ? Math.round((monthlyMatches / monthlyTotal) * 100)
    : 0

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">통계</h2>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow p-6">
          <h3 className="font-semibold text-gray-700 mb-4">업체 현황</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-500">전체 등록 업체</span>
              <span className="font-semibold">{totalCompanies}개</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">활성 업체</span>
              <span className="font-semibold text-green-600">{activeCompanies}개</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-6">
          <h3 className="font-semibold text-gray-700 mb-4">인력 현황</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-500">전체 등록 인력</span>
              <span className="font-semibold">{totalWorkers}명</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">현재 가용 인력</span>
              <span className="font-semibold text-green-600">{availableWorkers}명</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-6">
          <h3 className="font-semibold text-gray-700 mb-4">이번 달 매칭</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-500">매칭 성공</span>
              <span className="font-semibold text-green-600">{monthlyMatches}건</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">미해결</span>
              <span className="font-semibold text-red-500">{monthlyUnresolved}건</span>
            </div>
            <div className="flex justify-between border-t pt-2 mt-2">
              <span className="text-gray-700 font-medium">성공률</span>
              <span className={`font-bold ${successRate >= 80 ? "text-green-600" : "text-orange-500"}`}>
                {successRate}%
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-6">
          <h3 className="font-semibold text-gray-700 mb-4">누적 통계</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-500">총 매칭 성공</span>
              <span className="font-semibold">{totalMatches}건</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
```

---

## Step 9. 시드 데이터 (관리자 계정)

`prisma/seed.ts`에 추가:
```typescript
import { PrismaClient, UserRole } from "@prisma/client"
const prisma = new PrismaClient()

async function main() {
  // 관리자 계정
  await prisma.user.upsert({
    where: { email: "admin@guardon.kr" },
    update: {},
    create: {
      email: "admin@guardon.kr",
      name: "GuardOn 관리자",
      role: UserRole.ADMIN,
      phone: "010-0000-0000",
    },
  })

  // 테스트 업체 (G360)
  const companyOwner = await prisma.user.upsert({
    where: { email: "g360@test.com" },
    update: {},
    create: {
      email: "g360@test.com",
      name: "구본근",
      role: UserRole.COMPANY_OWNER,
      phone: "010-1234-5678",
    },
  })

  await prisma.company.upsert({
    where: { licenseNumber: "11-000001" },
    update: {},
    create: {
      ownerId: companyOwner.id,
      name: "G360 경호",
      licenseNumber: "11-000001",
      licenseVerified: true,
      isActive: true,
      address: "서울시 강남구 테헤란로 123",
      city: "서울",
      district: "강남구",
      phone: "02-1234-5678",
    },
  })

  console.log("✅ Seed data created")
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
```

실행:
```bash
npx ts-node prisma/seed.ts
```

---

## 성공 기준
- `/admin` 접근 시 ADMIN 역할만 허용, 다른 역할은 /unauthorized 리다이렉트
- 업체 승인 → isActive=true + licenseVerified=true 업데이트
- 자격증 반려 시 반려 사유 입력 필수 + 카카오 알림 발송
- SOS 모니터에서 최근 7일 모든 SOS 조회 가능
- 통계 페이지에서 이번 달 성공률 실시간 계산
