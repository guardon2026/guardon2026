// 프로필 사진 업로드 전 브라우저에서 축소·압축한다.
//
// 아바타는 최대 72px로 표시되므로 원본(요즘 휴대폰 사진은 2~5MB)을 그대로 저장할
// 이유가 없다. 사진은 base64로 DB에 저장되고 페이지 HTML에 그대로 실려 나가기
// 때문에, 원본을 넣으면 DB와 페이지가 모두 무거워진다.
// 320px / JPEG 0.8이면 고해상도 화면에서도 충분히 선명하면서 보통 30~50KB로 줄어든다.

const MAX_DIMENSION = 320
const QUALITY = 0.8

export async function resizeImageFile(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file)
  try {
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height))
    const width = Math.max(1, Math.round(bitmap.width * scale))
    const height = Math.max(1, Math.round(bitmap.height * scale))

    const canvas = document.createElement("canvas")
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext("2d")
    if (!ctx) throw new Error("canvas 2d 컨텍스트를 얻지 못했습니다.")

    // PNG·WEBP의 투명 배경이 JPEG에서 검게 나오지 않도록 흰색으로 채운다.
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, width, height)
    ctx.drawImage(bitmap, 0, 0, width, height)

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", QUALITY),
    )
    if (!blob) throw new Error("이미지 변환에 실패했습니다.")

    return new File([blob], "avatar.jpg", { type: "image/jpeg" })
  } finally {
    bitmap.close()
  }
}
