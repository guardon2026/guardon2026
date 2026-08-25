"use client"

import { useState } from "react"

interface AvatarImageProps {
  src?: string | null
  alt: string
  className?: string
  fallback: React.ReactNode
}

// 프로필 사진 URL이 깨져 있어도(예: 배포 시 초기화된 예전 로컬 경로) 깨진 이미지
// 아이콘 대신 지정된 대체 UI로 자연스럽게 폴백한다.
export function AvatarImage({ src, alt, className, fallback }: AvatarImageProps) {
  const [broken, setBroken] = useState(false)

  if (!src || broken) return <>{fallback}</>

  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} className={className} onError={() => setBroken(true)} />
}
