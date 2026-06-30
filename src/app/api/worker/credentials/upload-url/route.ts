import { NextRequest, NextResponse } from "next/server"
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { getServerSession } from "@/lib/session"
import { ERROR_MESSAGES } from "@/lib/constants"

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user || session.user.role !== "WORKER") {
      return NextResponse.json({ error: ERROR_MESSAGES.UNAUTHORIZED }, { status: 401 })
    }

    const body = await req.json()
    const { credentialType, contentType, fileExtension } = body

    // 필수 파라미터 검증
    if (!credentialType || !contentType || !fileExtension) {
      return NextResponse.json(
        { error: "필수 파라미터가 누락되었습니다." },
        { status: 400 },
      )
    }

    // 허용 MIME 타입 검증 — 임의 파일 업로드 차단 (T-04-02-05)
    if (!ALLOWED_MIME_TYPES.includes(contentType)) {
      return NextResponse.json(
        { error: "허용되지 않는 파일 형식입니다. (JPG, PNG, WEBP, PDF만 허용)" },
        { status: 400 },
      )
    }

    // 파일 경로는 서버가 생성 — 클라이언트가 Key를 조작할 수 없음 (T-04-02-02)
    const timestamp = Date.now()
    const fileKey = `credentials/${session.user.id}/${credentialType}/${timestamp}.${fileExtension}`

    const s3 = new S3Client({
      region: process.env.AWS_REGION ?? "ap-northeast-2",
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    })

    const command = new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET!,
      Key: fileKey,
      ContentType: contentType,
      ServerSideEncryption: "AES256", // CRED-04: SSE-S3 암호화 저장
      Metadata: {
        userId: session.user.id,
        credentialType,
      },
    })

    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 })

    return NextResponse.json({ uploadUrl, fileKey })
  } catch (error) {
    console.error("[upload-url] Error:", error)
    return NextResponse.json({ error: ERROR_MESSAGES.SERVER }, { status: 500 })
  }
}
