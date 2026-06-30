---
name: guardon-project-setup
description: "GuardOn Next.js 프로젝트 초기 설정 스킬. Next.js 14 App Router + TypeScript + PostgreSQL + Prisma + NextAuth v5 환경을 구성하고, 디렉터리 구조, 패키지 설치, 환경변수, Prisma 클라이언트 싱글턴, 미들웨어까지 세팅한다."
---

# GuardOn — 프로젝트 초기 설정 스킬

## 목적
GuardOn MVP의 Next.js + PostgreSQL + Prisma 기반 프로젝트를 처음부터 세팅한다.
PRD 참조: `/G360/guardon-prd.md`

---

## 전제 조건 확인
실행 전 아래를 확인하라:
- Node.js 18+ 설치 여부
- PostgreSQL 15+ 설치 또는 클라우드 DB(Supabase/Neon) 연결 정보
- 카카오 개발자 앱 생성 여부 (developers.kakao.com)
- 카카오 알림톡 비즈니스 채널 신청 여부 (심사 2~4주 → 개발 Day 1 신청 필수)

---

## Step 1. Next.js 프로젝트 생성

```bash
npx create-next-app@latest guardon \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*"
cd guardon
```

---

## Step 2. 핵심 패키지 설치

```bash
# ORM & DB
npm install prisma @prisma/client

# 인증
npm install next-auth@beta @auth/prisma-adapter

# 카카오 알림톡 (솔라피 또는 카카오 직접)
npm install node-fetch

# SMS 폴백
npm install solapi  # or coolsms

# 위치 계산 (반경 필터링)
npm install geolib

# 폼 & 유효성 검사
npm install react-hook-form zod @hookform/resolvers

# UI 컴포넌트
npm install @radix-ui/react-dialog @radix-ui/react-select lucide-react
npm install clsx tailwind-merge class-variance-authority

# 날짜 처리
npm install date-fns

# HTTP 클라이언트
npm install axios

# 개발 도구
npm install -D @types/node prettier eslint-config-prettier
```

---

## Step 3. 디렉토리 구조 생성

아래 구조를 생성하라:

```
guardon/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   └── layout.tsx
│   │   ├── (dashboard)/
│   │   │   ├── company/          # 업체 대표 화면
│   │   │   │   ├── sos/          # SOS 관리
│   │   │   │   ├── search/       # 인력 검색
│   │   │   │   └── history/      # 매칭 이력
│   │   │   ├── worker/           # 인력 화면
│   │   │   │   ├── profile/      # 프로필 관리
│   │   │   │   ├── notifications/ # SOS 알림
│   │   │   │   └── history/      # 배치 이력
│   │   │   └── layout.tsx
│   │   ├── admin/                # 관리자 화면
│   │   │   ├── members/
│   │   │   ├── credentials/
│   │   │   ├── sos-monitor/
│   │   │   └── stats/
│   │   ├── api/
│   │   │   ├── auth/[...nextauth]/
│   │   │   ├── sos/
│   │   │   ├── workers/
│   │   │   ├── companies/
│   │   │   ├── credentials/
│   │   │   └── notifications/
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── ui/                   # 공통 UI 컴포넌트
│   │   ├── sos/                  # SOS 관련 컴포넌트
│   │   ├── worker/               # 인력 관련 컴포넌트
│   │   ├── company/              # 업체 관련 컴포넌트
│   │   └── admin/                # 관리자 컴포넌트
│   ├── lib/
│   │   ├── prisma.ts             # Prisma 클라이언트
│   │   ├── auth.ts               # NextAuth 설정
│   │   ├── kakao.ts              # 카카오 API 유틸
│   │   ├── sms.ts                # SMS 폴백 유틸
│   │   ├── geo.ts                # 위치 계산 유틸
│   │   └── utils.ts              # 공통 유틸
│   ├── types/
│   │   └── index.ts              # 타입 정의
│   └── middleware.ts             # 인증 미들웨어
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── public/
├── .env.local
└── .env.example
```

---

## Step 4. 환경변수 설정

`.env.local` 파일을 생성하라:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/guardon?schema=public"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-min-32-chars"

# Kakao OAuth (developers.kakao.com)
KAKAO_CLIENT_ID="your-kakao-app-key"
KAKAO_CLIENT_SECRET="your-kakao-client-secret"

# Kakao 알림톡 (카카오 비즈니스 채널 심사 완료 후)
KAKAO_ALIMTALK_SENDER_KEY="your-sender-key"
KAKAO_ALIMTALK_PLUS_FRIEND_ID="your-plus-friend-id"

# SMS 폴백 (솔라피 또는 쿨SMS)
SOLAPI_API_KEY="your-solapi-key"
SOLAPI_API_SECRET="your-solapi-secret"
SOLAPI_SENDER_PHONE="15990000"  # 발신 번호

# 앱 설정
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_APP_NAME="GuardOn"
```

`.env.example` 파일도 동일 구조로 값만 비워서 생성하라.

---

## Step 5. Prisma 초기화

```bash
npx prisma init
```

`guardon-db-schema` 스킬을 실행하여 `prisma/schema.prisma`를 완성하라.

---

## Step 6. 기본 Prisma 클라이언트 설정

`src/lib/prisma.ts`:
```typescript
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

---

## Step 7. 미들웨어 (인증 보호)

`src/middleware.ts`:
```typescript
export { auth as middleware } from "@/lib/auth"

export const config = {
  matcher: [
    '/company/:path*',
    '/worker/:path*',
    '/admin/:path*',
  ]
}
```

---

## Step 8. 완료 확인

```bash
npm run dev
```

`http://localhost:3000` 접속 확인 후 다음 스킬 실행 순서:
1. `guardon-db-schema` — DB 스키마 설계
2. `guardon-auth` — 카카오 로그인 구현
3. `guardon-sos-engine` — SOS 매칭 엔진
4. `guardon-kakao` — 알림톡 연동
5. `guardon-admin` — 관리자 대시보드
6. `guardon-ui-components` — 핵심 UI 컴포넌트

---

## 성공 기준
- `npm run dev` 실행 후 에러 없음
- `/` 라우트 접근 가능
- Prisma 클라이언트 import 에러 없음
- `.env.local` 모든 키 설정 완료
