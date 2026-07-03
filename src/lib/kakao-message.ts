/**
 * 카카오톡 "나에게 보내기" 메시지 발송 유틸리티
 *
 * - OAuth 로그인 시 accounts 테이블에 저장된 access_token 사용
 * - 만료 시 refresh_token으로 자동 갱신
 * - talk_message scope 필요 (auth.ts의 authorization URL에 포함됨)
 */

import { prisma } from "./prisma"

const KAKAO_TOKEN_URL = "https://kauth.kakao.com/oauth/token"
const KAKAO_MEMO_URL = "https://kapi.kakao.com/v2/api/talk/memo/default/send"

interface KakaoRefreshResponse {
  access_token: string
  expires_in: number
  refresh_token?: string
  refresh_token_expires_in?: number
}

/**
 * 유저의 카카오 access_token 반환. 만료된 경우 refresh_token으로 갱신.
 * 카카오 계정이 없거나 갱신에 실패하면 null 반환.
 */
async function getValidKakaoToken(userId: string): Promise<string | null> {
  const account = await prisma.account.findFirst({
    where: { userId, provider: "kakao" },
    select: {
      providerAccountId: true,
      access_token: true,
      refresh_token: true,
      expires_at: true,
    },
  })

  if (!account?.access_token) return null

  const nowSec = Math.floor(Date.now() / 1000)
  // 만료까지 60초 이상 남아 있으면 현재 토큰 사용
  if (account.expires_at && account.expires_at - nowSec > 60) {
    return account.access_token
  }

  // 만료됐으면 refresh_token으로 갱신
  if (!account.refresh_token) return null

  try {
    const body = new URLSearchParams({
      grant_type: "refresh_token",
      client_id: process.env.KAKAO_CLIENT_ID!,
      refresh_token: account.refresh_token,
    })
    if (process.env.KAKAO_CLIENT_SECRET) {
      body.set("client_secret", process.env.KAKAO_CLIENT_SECRET)
    }

    const res = await fetch(KAKAO_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    })
    if (!res.ok) return null

    const data: KakaoRefreshResponse = await res.json()
    const newExpiresAt = nowSec + data.expires_in

    await prisma.account.update({
      where: {
        provider_providerAccountId: {
          provider: "kakao",
          providerAccountId: account.providerAccountId,
        },
      },
      data: {
        access_token: data.access_token,
        expires_at: newExpiresAt,
        ...(data.refresh_token ? { refresh_token: data.refresh_token } : {}),
      },
    })

    return data.access_token
  } catch (err) {
    console.error("[kakao-message] token refresh failed:", err)
    return null
  }
}

/**
 * 카카오톡 "나에게 보내기" 텍스트 메시지 발송.
 * 실패해도 throw하지 않음 — 인앱 알림이 이미 저장되어 있으므로 무시.
 */
export async function sendKakaoMessage(
  userId: string,
  title: string,
  body: string,
): Promise<void> {
  try {
    const token = await getValidKakaoToken(userId)
    if (!token) return // 카카오 계정 없음 또는 토큰 갱신 실패

    const text = `[GuardOn] ${title}\n${body}`
    const templateObject = JSON.stringify({
      object_type: "text",
      text: text.slice(0, 200), // Kakao 텍스트 최대 200자
      link: {
        web_url: process.env.NEXT_PUBLIC_BASE_URL ?? "https://guardon.kr",
        mobile_web_url: process.env.NEXT_PUBLIC_BASE_URL ?? "https://guardon.kr",
      },
    })

    const res = await fetch(KAKAO_MEMO_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ template_object: templateObject }).toString(),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error(`[kakao-message] send failed for user ${userId}:`, err)
    }
  } catch (err) {
    console.error("[kakao-message] unexpected error:", err)
  }
}

/**
 * 여러 유저에게 카카오 메시지를 병렬 발송 (fire-and-forget).
 */
export function sendKakaoMessages(
  recipients: { userId: string; title: string; body: string }[],
): void {
  for (const r of recipients) {
    void sendKakaoMessage(r.userId, r.title, r.body)
  }
}
