import type { MetadataRoute } from "next"

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://guardon.kr"

// 로그인 이후의 모든 화면은 인증이 필요한 내부 앱 페이지라 검색엔진에
// 노출될 필요가 없다. 공개 마케팅 페이지만 명시적으로 허용하고 나머지는 차단.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      disallow: ["/"],
      allow: ["/$", "/login", "/terms", "/privacy"],
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
  }
}
