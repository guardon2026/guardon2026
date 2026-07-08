/**
 * 알림 생성 헬퍼
 *
 * DB(notifications 테이블) 저장 + 카카오톡 "나에게 보내기" 병렬 발송.
 * 카카오 발송은 fire-and-forget — 실패해도 DB 알림은 이미 저장됨.
 */

import { NotificationChannel, NotificationStatus } from "@prisma/client"
import { prisma } from "./prisma"
import { sendKakaoMessages } from "./kakao-message"

export interface NotificationInput {
  userId: string
  sosRequestId?: string
  type: string
  title: string
  body: string
  sentAt?: Date
}

/**
 * 알림을 DB에 저장하고, 카카오 로그인 유저에게는 카카오톡 메시지도 발송.
 * Prisma 트랜잭션 외부에서 호출할 것.
 */
export async function createNotifications(items: NotificationInput[]): Promise<void> {
  if (items.length === 0) return

  const now = new Date()

  await prisma.notification.createMany({
    data: items.map((n) => ({
      userId: n.userId,
      sosRequestId: n.sosRequestId ?? null,
      type: n.type,
      channel: NotificationChannel.IN_APP,
      status: NotificationStatus.SENT,
      title: n.title,
      body: n.body,
      sentAt: n.sentAt ?? now,
    })),
  })

  // 카카오 로그인 유저 필터링 후 메시지 발송 (fire-and-forget)
  const userIds = Array.from(new Set(items.map((n) => n.userId)))
  const kakaoAccounts = await prisma.account.findMany({
    where: { userId: { in: userIds }, provider: "kakao" },
    select: { userId: true },
  })
  const kakaoUserIds = new Set(kakaoAccounts.map((a) => a.userId))

  sendKakaoMessages(
    items
      .filter((n) => kakaoUserIds.has(n.userId))
      .map((n) => ({ userId: n.userId, title: n.title, body: n.body })),
  )
}
