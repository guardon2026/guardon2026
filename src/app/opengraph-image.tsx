import { ImageResponse } from "next/og"

export const runtime = "edge"
export const alt = "가드온 GuardOn - 경비·보안 인력 긴급 매칭 플랫폼"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #1d4ed8 0%, #2563eb 55%, #3b82f6 100%)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 96,
              height: 96,
              borderRadius: 24,
              background: "rgba(255,255,255,0.15)",
            }}
          >
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <div style={{ display: "flex", fontSize: 88, fontWeight: 700, color: "white" }}>
            가드온
          </div>
        </div>
        <div style={{ display: "flex", fontSize: 32, color: "rgba(255,255,255,0.85)", marginTop: 24 }}>
          GuardOn · 경비·보안 인력 긴급 매칭 플랫폼
        </div>
      </div>
    ),
    { ...size }
  )
}
