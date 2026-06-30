import "@fontsource/pretendard/400.css"
import "@fontsource/pretendard/600.css"
import "./globals.css"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "GuardOn",
  description: "경비·보안 인력 긴급 매칭 플랫폼",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="font-sans antialiased bg-white text-gray-900">{children}</body>
    </html>
  )
}
