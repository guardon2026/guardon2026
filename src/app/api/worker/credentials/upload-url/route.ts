export const dynamic = 'force-dynamic'
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

    // ?�수 ?�라미터 검�?    if (!credentialType || !contentType || !fileExtension) {
      return NextResponse.json(
        { error: "?�수 ?�라미터가 ?�락?�었?�니??" },
        { status: 400 },
      )
    }

    // ?�용 MIME ?�??검�????�의 ?�일 ?�로??차단 (T-04-02-05)
    if (!ALLOWED_MIME_TYPES.includes(contentType)) {
      return NextResponse.json(
        { error: "?�용?��? ?�는 ?�일 ?�식?�니?? (JPG, PNG, WEBP, PDF�??�용)" },
        { status: 400 },
      )
    }

    // ?�일 경로???�버가 ?�성 ???�라?�언?��? Key�?조작?????�음 (T-04-02-02)
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
      ServerSideEncryption: "AES256", // CRED-04: SSE-S3 ?�호???�??      Metadata: {
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
