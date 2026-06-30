---
name: guardon-db-schema
description: "GuardOn Prisma 스키마 스킬. User, Company, WorkerProfile, WorkerCredential, SosRequest, SosResponse, MatchHistory, Notification, ConsentLog 등 전체 12개 모델을 정의하고, Row-Level Security SQL과 마이그레이션 명령을 포함한다."
---

# GuardOn — 데이터베이스 스키마 스킬

## 목적
GuardOn PRD의 모든 FR을 지원하는 PostgreSQL 스키마를 Prisma로 구현한다.
멀티테넌트(업체 단위 데이터 격리), 위치 기반 검색, 자격증 인증, SOS 매칭을 지원한다.

PRD 참조: `/G360/guardon-prd.md` — FR1~FR41, Multi-Tenancy Model, RBAC 섹션

---

## prisma/schema.prisma 전체 구현

아래 스키마를 `prisma/schema.prisma`에 작성하라:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─────────────────────────────────────────
// ENUMS
// ─────────────────────────────────────────

enum UserRole {
  COMPANY_OWNER   // 업체 대표 (FR1, RBAC)
  WORKER          // 인력·구직자 (FR2, RBAC)
  ADMIN           // 플랫폼 관리자 (FR7, RBAC)
}

enum AvailabilityStatus {
  AVAILABLE       // 가용 (FR6)
  UNAVAILABLE     // 불가
  BUSY            // 배치 중
}

enum CredentialType {
  // MVP 자격증 (Domain Requirements)
  SECURITY_INSTRUCTOR   // 경비지도사
  BODYGUARD             // 신변보호사
  SECURITY_TRAINING     // 신임경비교육이수
  SPECIAL_SECURITY      // 특수경비원
  // Growth 자격증
  CIVIL_POLICE          // 청원경찰
  KRAV_MAGA             // 크라브마가
}

enum CredentialStatus {
  PENDING    // 심사 중 (FR8)
  APPROVED   // 인증 완료 (FR9, FR10)
  REJECTED   // 반려 (FR9)
}

enum WorkField {
  GENERAL_SECURITY      // 일반경비
  BODYGUARD_SERVICE     // 신변보호
  SPECIAL_SECURITY      // 특수경비
  KRAV_MAGA_INSTRUCTOR  // 크라브마가강사
  EVENT_SECURITY        // 행사경비
}

enum SosStatus {
  DISPATCHING    // 알림 발송 중 (FR18)
  PENDING        // 수락 대기 (FR23)
  CONFIRMED      // 확정 (FR22)
  UNRESOLVED     // 미해결 (FR24)
  CANCELLED      // 취소
  COMPLETED      // 완료
}

enum NotificationType {
  SOS_REQUEST        // SOS 요청 (FR25)
  SOS_ACCEPTED       // 수락
  SOS_CONFIRMED      // 확정 (FR22)
  SOS_CANCELLED      // 취소
  SOS_UNRESOLVED     // 미해결 (FR24)
  CREDENTIAL_APPROVED // 자격증 승인 (FR9)
  CREDENTIAL_REJECTED // 자격증 반려
}

enum NotificationChannel {
  KAKAO_ALIMTALK  // 카카오 알림톡 (FR25)
  SMS             // SMS 폴백 (FR26)
  IN_APP          // 인앱 알림 (FR27)
}

// ─────────────────────────────────────────
// USER (공통 계정)
// ─────────────────────────────────────────

model User {
  id            String    @id @default(cuid())
  email         String?   @unique
  phone         String?   @unique
  kakaoId       String?   @unique       // 카카오 소셜 로그인 (FR3)
  name          String
  role          UserRole
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  // Relations
  company       Company?  @relation("CompanyOwner")
  workerProfile WorkerProfile?
  notifications Notification[]
  accounts      Account[]
  sessions      Session[]

  @@map("users")
}

// NextAuth 필수 테이블
model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
  @@map("accounts")
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("sessions")
}

// ─────────────────────────────────────────
// COMPANY (경비업체 — 테넌트 단위)
// ─────────────────────────────────────────

model Company {
  id              String    @id @default(cuid())
  ownerId         String    @unique       // FR4, 업체 대표
  name            String
  licenseNumber   String    @unique       // 경비업 허가번호 (FR1, FR40)
  licenseVerified Boolean   @default(false) // 관리자 승인 여부 (FR7)
  description     String?
  address         String
  city            String                  // 검색 필터용 (FR12)
  district        String                  // 시/구 단위
  phone           String
  isActive        Boolean   @default(false) // 관리자 승인 후 활성화
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  // Tenancy — 이 업체의 모든 데이터
  owner           User      @relation("CompanyOwner", fields: [ownerId], references: [id])
  sosRequests     SosRequest[]
  matchHistory    MatchHistory[] @relation("CompanyMatch")
  ratings         WorkerRating[] @relation("CompanyRating")

  @@map("companies")
}

// ─────────────────────────────────────────
// WORKER PROFILE (인력·구직자)
// ─────────────────────────────────────────

model WorkerProfile {
  id              String             @id @default(cuid())
  userId          String             @unique
  workFields      WorkField[]        // 분야 (FR13)
  experienceYears Int                @default(0)   // 경력 연수 (FR14)
  address         String
  city            String
  district        String
  latitude        Float              // 위치 기반 반경 검색용 (PostGIS 대안)
  longitude       Float
  desiredHourlyRate Int?             // 시급 희망 (FR5)
  bio             String?
  availability    AvailabilityStatus @default(UNAVAILABLE) // FR6
  averageRating   Float              @default(0)
  totalMatches    Int                @default(0)
  isProfilePublic Boolean            @default(true)
  createdAt       DateTime           @default(now())
  updatedAt       DateTime           @updatedAt

  user            User               @relation(fields: [userId], references: [id], onDelete: Cascade)
  credentials     WorkerCredential[] // FR8~FR11
  matchHistory    MatchHistory[]     @relation("WorkerMatch")
  sosResponses    SosResponse[]
  ratings         WorkerRating[]     @relation("WorkerRatings")

  @@map("worker_profiles")
}

// ─────────────────────────────────────────
// CREDENTIALS (자격증 인증 뱃지)
// ─────────────────────────────────────────

model WorkerCredential {
  id              String           @id @default(cuid())
  workerProfileId String
  type            CredentialType
  status          CredentialStatus @default(PENDING) // FR8, FR9
  documentUrl     String           // 서류 업로드 URL (암호화 스토리지)
  issuedDate      DateTime?        // 자격증 발급일
  approvedAt      DateTime?        // 관리자 승인 시각 (FR9)
  rejectedAt      DateTime?
  rejectionReason String?
  adminNote       String?
  createdAt       DateTime         @default(now())
  updatedAt       DateTime         @updatedAt

  workerProfile   WorkerProfile    @relation(fields: [workerProfileId], references: [id], onDelete: Cascade)

  @@unique([workerProfileId, type]) // 동일 자격증 중복 방지
  @@map("worker_credentials")
}

// ─────────────────────────────────────────
// SOS REQUEST (긴급 매칭 요청)
// ─────────────────────────────────────────

model SosRequest {
  id              String      @id @default(cuid())
  companyId       String                           // 테넌트 격리 (FR39)
  title           String
  location        String                           // 집결지 주소 (FR22)
  city            String
  district        String
  latitude        Float                            // 위치 기반 반경 발송
  longitude       Float
  scheduledAt     DateTime                         // 배치 날짜·시간 (FR17)
  requiredCount   Int                              // 필요 인원 (FR17)
  requiredFields  WorkField[]                      // 필요 분야 (FR17)
  requiredCredentials CredentialType[]             // 필요 자격증 (FR17)
  hourlyRate      Int                              // 시급 (FR17)
  description     String?
  status          SosStatus   @default(DISPATCHING) // FR23
  radiusKm        Float       @default(20)         // 현재 발송 반경 (FR19)
  dispatchedAt    DateTime?                        // 알림 최초 발송 시각
  expandedAt      DateTime?                        // 반경 확장 시각 (FR19)
  confirmedAt     DateTime?                        // 매칭 확정 시각
  unresolvedAt    DateTime?
  cancelledAt     DateTime?
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt

  // 테넌트 격리: company에서만 접근 가능
  company         Company     @relation(fields: [companyId], references: [id])
  responses       SosResponse[]
  matchHistory    MatchHistory[]
  notifications   Notification[]

  @@index([companyId])
  @@index([status])
  @@index([scheduledAt])
  @@map("sos_requests")
}

// ─────────────────────────────────────────
// SOS RESPONSE (인력 수락/거절)
// ─────────────────────────────────────────

model SosResponse {
  id              String        @id @default(cuid())
  sosRequestId    String
  workerProfileId String
  status          String        // 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CONFIRMED' | 'DECLINED'
  respondedAt     DateTime?     // 수락/거절 시각 (FR20)
  confirmedAt     DateTime?     // 업체 최종 확정 시각 (FR21)
  createdAt       DateTime      @default(now())

  sosRequest      SosRequest    @relation(fields: [sosRequestId], references: [id])
  workerProfile   WorkerProfile @relation(fields: [workerProfileId], references: [id])

  @@unique([sosRequestId, workerProfileId])
  @@map("sos_responses")
}

// ─────────────────────────────────────────
// MATCH HISTORY (매칭 이력)
// ─────────────────────────────────────────

model MatchHistory {
  id              String        @id @default(cuid())
  sosRequestId    String
  companyId       String                           // 테넌트 격리 (FR39)
  workerProfileId String
  status          String        // 'COMPLETED' | 'CANCELLED' | 'NO_SHOW'
  scheduledAt     DateTime
  completedAt     DateTime?
  hourlyRate      Int
  createdAt       DateTime      @default(now())

  sosRequest      SosRequest    @relation(fields: [sosRequestId], references: [id])
  company         Company       @relation("CompanyMatch", fields: [companyId], references: [id])
  workerProfile   WorkerProfile @relation("WorkerMatch", fields: [workerProfileId], references: [id])
  rating          WorkerRating?

  @@index([companyId])    // 업체별 이력 조회 (FR28)
  @@index([workerProfileId]) // 인력별 이력 조회 (FR29)
  @@map("match_history")
}

// ─────────────────────────────────────────
// WORKER RATING (평점)
// ─────────────────────────────────────────

model WorkerRating {
  id              String        @id @default(cuid())
  matchHistoryId  String        @unique
  companyId       String                           // 평점 남긴 업체 (FR30)
  workerProfileId String
  score           Int           // 1~5점 (FR30)
  comment         String?
  createdAt       DateTime      @default(now())

  matchHistory    MatchHistory  @relation(fields: [matchHistoryId], references: [id])
  company         Company       @relation("CompanyRating", fields: [companyId], references: [id])
  workerProfile   WorkerProfile @relation("WorkerRatings", fields: [workerProfileId], references: [id])

  @@index([workerProfileId]) // 평점 집계 (FR31)
  @@map("worker_ratings")
}

// ─────────────────────────────────────────
// NOTIFICATIONS (알림 이력)
// ─────────────────────────────────────────

model Notification {
  id              String              @id @default(cuid())
  userId          String
  sosRequestId    String?
  type            NotificationType
  channel         NotificationChannel
  title           String
  body            String
  isRead          Boolean             @default(false)
  sentAt          DateTime?
  failedAt        DateTime?
  fallbackSentAt  DateTime?           // SMS 폴백 발송 시각 (FR26)
  createdAt       DateTime            @default(now())

  user            User                @relation(fields: [userId], references: [id])
  sosRequest      SosRequest?         @relation(fields: [sosRequestId], references: [id])

  @@index([userId])
  @@index([createdAt])
  @@map("notifications")
}

// ─────────────────────────────────────────
// CONSENT LOG (개인정보 동의 — FR37)
// ─────────────────────────────────────────

model ConsentLog {
  id              String    @id @default(cuid())
  userId          String
  personalInfoConsent  Boolean   @default(false)  // 개인정보 수집·이용 동의
  locationConsent      Boolean   @default(false)  // 위치정보 수집 동의
  termsConsent         Boolean   @default(false)  // 이용약관 동의 (FR41)
  consentedAt     DateTime  @default(now())
  ipAddress       String?

  @@map("consent_logs")
}
```

---

## 마이그레이션 실행

```bash
npx prisma migrate dev --name init
npx prisma generate
```

---

## 시드 데이터 (개발용)

`prisma/seed.ts`에 아래를 작성하라:
- 관리자 계정 1개
- 테스트 업체 3개 (G360, KKM, 블랙아이언)
- 테스트 인력 10명 (자격증 다양하게)

```bash
npx ts-node prisma/seed.ts
```

---

## Row-level Security (PostgreSQL 직접 설정)

Prisma 마이그레이션 후 아래 SQL을 실행하라 (NFR-S4):

```sql
-- 업체 데이터 격리 정책
ALTER TABLE sos_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_history ENABLE ROW LEVEL SECURITY;

-- 참고: Next.js API에서 companyId 필터를 반드시 적용
-- Prisma는 RLS를 직접 지원하지 않으므로
-- 모든 쿼리에 where: { companyId: session.user.companyId } 추가 필수
```

---

## 성공 기준
- `npx prisma migrate dev` 에러 없이 완료
- `npx prisma studio` 에서 모든 테이블 확인 가능
- 시드 데이터 정상 삽입
- 모든 FR(1~41)에 대응하는 필드 존재
