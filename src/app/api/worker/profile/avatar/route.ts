export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { writeFile, mkdir } from "fs/promises"
import { join } from "path"

const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"]
const MAX_SIZE = 5 * 1024 * 1024 // 5MB

export async function POST(req: NextRequest) {
  const session = await getServerSession()
  if (!session?.user?.id || session.user.role !== "WORKER") {
    return NextResponse.json({ error: "권한???�습?�다." }, { status: 401 })
  }

  const profile = await prisma.workerProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  })
  if (!profile) {
    return NextResponse.json({ error: "?�로?�이 ?�습?�다." }, { status: 404 })
  }

  const formData = await req.formData()
  const file = formData.get("file") as File | null
  if (!file) {
    return NextResponse.json({ error: "?�일???�습?�다." }, { status: 400 })
  }
  if (!ALLOWED_MIME.includes(file.type)) {
    return NextResponse.json({ error: "JPG, PNG, WEBP ?�일�??�로??가?�합?�다." }, { status: 400 })
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "?�일 ?�기??5MB ?�하?�야 ?�니??" }, { status: 400 })
  }

  const ext = file.type === "image/webp" ? "webp" : file.type === "image/png" ? "png" : "jpg"
  const filename = `${session.user.id}-${Date.now()}.${ext}`
  const uploadDir = join(process.cwd(), "public", "uploads", "avatars")
  await mkdir(uploadDir, { recursive: true })

  const bytes = await file.arrayBuffer()
  await writeFile(join(uploadDir, filename), Buffer.from(bytes))

  const url = `/uploads/avatars/${filename}`
  await prisma.workerProfile.update({
    where: { id: profile.id },
    data: { profileImageUrl: url },
  })

  return NextResponse.json({ url })
}
