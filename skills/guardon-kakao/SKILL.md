---
name: guardon-kakao
description: "GuardOn 알림 스킬. 카카오 알림톡 템플릿 등록 가이드, 알림톡 발송 클라이언트, 솔라피 SMS 폴백, 인앱 Notification 테이블 기반 읽음/미읽음 관리, 알림 뱃지 컴포넌트를 구현한다. 알림톡 심사 기간(2~4주) 대응 방법 포함."
---

# GuardOn — 카카오 알림톡 + SMS 폴백 스킬

## 목적
FR25~FR27, NFR-I1을 구현한다.
- 카카오 알림톡 발송 (FR25): SOS 요청 알림, 확정 알림, 자격증 심사 결과
- SMS 폴백 (FR26): 알림톡 실패 시 자동 전환
- 인앱 알림 (FR27): Notification 테이블 기반 읽음/미읽음 관리

⚠️ **Critical Path**: 카카오 알림톡 비즈니스 채널 심사는 2~4주 소요.
개발 Day 1에 https://business.kakao.com 에서 채널 신청 필수.
심사 기간 동안 SMS만으로 개발/테스트 진행.

PRD 참조: `/G360/guardon-prd.md` — FR25~FR27, NFR-I1

---

## 환경 변수 확인

`.env.local`에 아래 항목이 있어야 한다:
```env
KAKAO_ALIMTALK_SENDER_KEY="your-sender-key"
KAKAO_ALIMTALK_PLUS_FRIEND_ID="@guardon"

SOLAPI_API_KEY="your-solapi-api-key"
SOLAPI_API_SECRET="your-solapi-api-secret"
SOLAPI_SENDER_PHONE="15990000"
```

---

## Step 1. 알림톡 템플릿 등록

카카오 비즈니스 채널에서 아래 템플릿을 등록하라.
템플릿은 심사 후 `templateCode`를 발급받아 코드에 삽입한다.

### 템플릿 1: SOS 요청 알림 (인력 수신)
```
[GuardOn] SOS 요청이 도착했습니다!

업체: #{companyName}
일시: #{scheduledAt}
장소: #{location}
시급: #{hourlyRate}원/시간
필요 인원: #{requiredCount}명

아래 버튼을 눌러 5분 안에 수락/거절해주세요.

▶ 수락하기: #{acceptUrl}
▶ 거절하기: #{rejectUrl}
```
템플릿 코드: `SOS_REQUEST_V1`

### 템플릿 2: SOS 확정 알림 (인력 수신)
```
[GuardOn] 배치가 확정되었습니다 ✅

#{sosTitle}
일시: #{scheduledAt}
장소: #{location}
시급: #{hourlyRate}원/시간

집결지 주소: #{location}
문의: #{companyPhone}
```
템플릿 코드: `SOS_CONFIRMED_V1`

### 템플릿 3: 자격증 승인 알림
```
[GuardOn] 자격증 인증이 완료되었습니다 🏅

#{credentialType} 자격증이 승인되었습니다.
이제 해당 분야의 SOS 요청을 수락할 수 있습니다.
```
템플릿 코드: `CREDENTIAL_APPROVED_V1`

### 템플릿 4: 자격증 반려 알림
```
[GuardOn] 자격증 서류 검토 결과

#{credentialType} 자격증 서류가 반려되었습니다.
사유: #{rejectionReason}

앱에서 서류를 다시 제출해주세요.
```
템플릿 코드: `CREDENTIAL_REJECTED_V1`

---

## Step 2. Kakao 알림톡 클라이언트

`src/lib/kakao.ts`:
```typescript
interface AlimtalkMessage {
  to: string        // 수신 전화번호 (010-xxxx-xxxx)
  templateCode: string
  templateParams: Record<string, string>
  failover?: {      // SMS 폴백
    content: string
  }
}

interface AlimtalkResponse {
  messageId: string
  statusCode: string
  statusMessage: string
}

async function sendAlimtalk(message: AlimtalkMessage): Promise<AlimtalkResponse> {
  const response = await fetch("https://kakaoapi.aligo.in/akv10/alimtalk/send/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      apikey: process.env.KAKAO_ALIMTALK_SENDER_KEY,
      userid: process.env.KAKAO_ALIMTALK_PLUS_FRIEND_ID,
      senderkey: process.env.KAKAO_ALIMTALK_SENDER_KEY,
      tpl_code: message.templateCode,
      receiver_1: message.to,
      recvname_1: "",
      ...Object.fromEntries(
        Object.entries(message.templateParams).map(([k, v]) => [`emtitle_1`, v])
      ),
    }),
  })

  if (!response.ok) {
    throw new Error(`Kakao API error: ${response.statusText}`)
  }

  return response.json()
}

// ─────────────────────────────────────────
// SOS 요청 알림 발송 (FR25)
// ─────────────────────────────────────────
export async function sendSosNotification(
  sosId: string,
  userIds: string[]
): Promise<void> {
  const { prisma } = await import("./prisma")

  const sos = await prisma.sosRequest.findUnique({
    where: { id: sosId },
    include: { company: true },
  })
  if (!sos) return

  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, phone: true },
  })

  const BASE_URL = process.env.NEXT_PUBLIC_APP_URL

  for (const user of users) {
    if (!user.phone) continue

    const notificationRecord = await prisma.notification.create({
      data: {
        userId: user.id,
        sosRequestId: sosId,
        type: "SOS_REQUEST",
        channel: "KAKAO_ALIMTALK",
        title: `SOS 요청: ${sos.title}`,
        body: `${sos.company.name} | ${sos.location} | ${sos.hourlyRate}원`,
      },
    })

    try {
      await sendAlimtalk({
        to: user.phone,
        templateCode: "SOS_REQUEST_V1",
        templateParams: {
          companyName: sos.company.name,
          scheduledAt: sos.scheduledAt.toLocaleString("ko-KR"),
          location: sos.location,
          hourlyRate: sos.hourlyRate.toLocaleString(),
          requiredCount: String(sos.requiredCount),
          acceptUrl: `${BASE_URL}/worker/sos/${sosId}/accept`,
          rejectUrl: `${BASE_URL}/worker/sos/${sosId}/reject`,
        },
      })

      await prisma.notification.update({
        where: { id: notificationRecord.id },
        data: { sentAt: new Date() },
      })
    } catch (err) {
      // 알림톡 실패 → SMS 폴백 (FR26)
      await sendSmsFallback(user.phone, sos, notificationRecord.id)
    }
  }
}

// ─────────────────────────────────────────
// SMS 폴백 (FR26)
// ─────────────────────────────────────────
async function sendSmsFallback(
  phone: string,
  sos: { title: string; location: string; hourlyRate: number },
  notificationId: string
): Promise<void> {
  const { prisma } = await import("./prisma")
  const { sendSms } = await import("./sms")

  const message = `[GuardOn] SOS: ${sos.title}\n장소: ${sos.location}\n시급: ${sos.hourlyRate.toLocaleString()}원\n앱에서 수락하세요`

  try {
    await sendSms(phone, message)
    await prisma.notification.update({
      where: { id: notificationId },
      data: {
        channel: "SMS",
        fallbackSentAt: new Date(),
      },
    })
  } catch (smsErr) {
    await prisma.notification.update({
      where: { id: notificationId },
      data: { failedAt: new Date() },
    })
  }
}

// ─────────────────────────────────────────
// 자격증 결과 알림
// ─────────────────────────────────────────
export async function sendCredentialResult(
  userId: string,
  credentialType: string,
  approved: boolean,
  rejectionReason?: string
): Promise<void> {
  const { prisma } = await import("./prisma")

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { phone: true },
  })
  if (!user?.phone) return

  await prisma.notification.create({
    data: {
      userId,
      type: approved ? "CREDENTIAL_APPROVED" : "CREDENTIAL_REJECTED",
      channel: "KAKAO_ALIMTALK",
      title: approved ? "자격증 승인" : "자격증 반려",
      body: approved
        ? `${credentialType} 자격증이 승인되었습니다.`
        : `${credentialType} 자격증이 반려되었습니다. 사유: ${rejectionReason}`,
      sentAt: new Date(),
    },
  })

  try {
    await sendAlimtalk({
      to: user.phone,
      templateCode: approved ? "CREDENTIAL_APPROVED_V1" : "CREDENTIAL_REJECTED_V1",
      templateParams: {
        credentialType,
        ...(rejectionReason ? { rejectionReason } : {}),
      },
    })
  } catch {
    // 알림톡 실패는 무시 (인앱 알림으로 대체)
  }
}
```

---

## Step 3. SMS 유틸 (솔라피)

`src/lib/sms.ts`:
```typescript
// npm install solapi
import SolapiMessageService from "solapi"

let solapiClient: SolapiMessageService | null = null

function getSolapiClient(): SolapiMessageService {
  if (!solapiClient) {
    solapiClient = new SolapiMessageService(
      process.env.SOLAPI_API_KEY!,
      process.env.SOLAPI_API_SECRET!
    )
  }
  return solapiClient
}

export async function sendSms(to: string, content: string): Promise<void> {
  const client = getSolapiClient()

  await client.sendMany([
    {
      to,
      from: process.env.SOLAPI_SENDER_PHONE!,
      text: content,
    },
  ])
}

export async function sendBulkSms(
  recipients: { phone: string; message: string }[]
): Promise<void> {
  const client = getSolapiClient()

  const messages = recipients.map(({ phone, message }) => ({
    to: phone,
    from: process.env.SOLAPI_SENDER_PHONE!,
    text: message,
  }))

  await client.sendMany(messages)
}
```

---

## Step 4. 인앱 알림 API (FR27)

`src/app/api/notifications/route.ts`:
```typescript
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const unreadOnly = searchParams.get("unread") === "true"

  const notifications = await prisma.notification.findMany({
    where: {
      userId: session.user.id,
      ...(unreadOnly ? { isRead: false } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  })

  return NextResponse.json(notifications)
}

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { notificationIds } = await req.json()

  await prisma.notification.updateMany({
    where: {
      id: { in: notificationIds },
      userId: session.user.id, // 본인 알림만 수정 가능
    },
    data: { isRead: true },
  })

  return NextResponse.json({ success: true })
}
```

---

## Step 5. 알림 배지 컴포넌트

`src/components/ui/NotificationBadge.tsx`:
```typescript
"use client"
import { useEffect, useState } from "react"
import { Bell } from "lucide-react"

export function NotificationBadge() {
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    const fetchUnread = async () => {
      const res = await fetch("/api/notifications?unread=true")
      const data = await res.json()
      setUnreadCount(data.length)
    }

    fetchUnread()
    // 30초마다 폴링 (MVP: WebSocket 대신 폴링)
    const interval = setInterval(fetchUnread, 30_000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="relative">
      <Bell className="w-6 h-6" />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs 
                         rounded-full w-5 h-5 flex items-center justify-center">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </div>
  )
}
```

---

## 개발 중 테스트 방법

알림톡 심사 기간 동안 아래 방법으로 테스트:

```typescript
// src/lib/kakao.ts 상단에 개발 환경 모크 추가
if (process.env.NODE_ENV === "development") {
  console.log("[DEV] Kakao 알림톡 (MOCK):", { to, templateCode, templateParams })
  return { messageId: "mock-id", statusCode: "200", statusMessage: "OK" }
}
```

SMS는 솔라피 테스트 API 키로 실제 발송 테스트 가능.

---

## 성공 기준
- SOS 생성 시 대상 인력 전화번호로 알림톡 발송 (또는 SMS 폴백)
- 알림톡 실패 시 5초 이내 SMS 자동 전환
- Notification 테이블에 sentAt / fallbackSentAt 정확히 기록
- `/api/notifications?unread=true` 미읽음 알림 목록 반환
- PATCH로 알림 읽음 처리 시 isRead=true 업데이트
