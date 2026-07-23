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

    // ?„μ ?λΌλ―Έν„° κ²€μ¦?    if (!credentialType || !contentType || !fileExtension) {
      return NextResponse.json(
        { error: "?„μ ?λΌλ―Έν„°κ°€ ?„λ½?μ—?µλ‹??" },
        { status: 400 },
      )
    }

    // ?μ© MIME ?€??κ²€μ¦????„μ ?μΌ ?…λ΅??μ°¨λ‹¨ (T-04-02-05)
    if (!ALLOWED_MIME_TYPES.includes(contentType)) {
      return NextResponse.json(
        { error: "?μ©?μ? ?λ” ?μΌ ?•μ‹?…λ‹?? (JPG, PNG, WEBP, PDFλ§??μ©)" },
        { status: 400 },
      )
    }

    // ?μΌ κ²½λ΅???λ²„κ°€ ?μ„± ???΄λΌ?΄μ–Έ?Έκ? Keyλ¥?μ΅°μ‘?????†μ (T-04-02-02)
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
      ServerSideEncryption: "AES256", // CRED-04: SSE-S3 ?”νΈ???€??      Metadata: {
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
