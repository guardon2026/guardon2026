import "@fontsource/pretendard/400.css"
import "@fontsource/pretendard/600.css"
import "./globals.css"
import type { Metadata } from "next"
import { Providers } from "@/components/providers"

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://guardon.kr"

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "가드온 GuardOn | 경비·보안 인력 긴급 매칭 플랫폼",
    template: "%s | 가드온 GuardOn",
  },
  description:
    "가드온(GuardOn)은 경비·보안 업체와 경비 인력을 잇는 B2B 긴급 매칭 플랫폼입니다. 결원 발생 시 검증된 인력을 평균 8분 내로 연결합니다.",
  keywords: [
    "가드온", "GuardOn", "가드온 경비", "경비 인력", "보안 인력", "경비업체",
    "경호 인력", "SOS 긴급 매칭", "일용직 경비", "경비 구인", "경비 매칭 플랫폼",
  ],
  applicationName: "가드온",
  authors: [{ name: "주식회사 G360" }],
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION || undefined,
    other: process.env.NAVER_SITE_VERIFICATION
      ? { "naver-site-verification": process.env.NAVER_SITE_VERIFICATION }
      : undefined,
  },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: "/",
    siteName: "가드온 GuardOn",
    title: "가드온 GuardOn | 경비·보안 인력 긴급 매칭 플랫폼",
    description:
      "경비·보안 업체와 경비 인력을 잇는 B2B 긴급 매칭 플랫폼. 결원 발생 시 검증된 인력을 평균 8분 내로 연결합니다.",
  },
  twitter: {
    card: "summary_large_image",
    title: "가드온 GuardOn | 경비·보안 인력 긴급 매칭 플랫폼",
    description:
      "경비·보안 업체와 경비 인력을 잇는 B2B 긴급 매칭 플랫폼. 결원 발생 시 검증된 인력을 평균 8분 내로 연결합니다.",
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="font-sans antialiased bg-white text-gray-900">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
