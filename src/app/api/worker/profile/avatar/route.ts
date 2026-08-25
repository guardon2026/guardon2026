export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/session"
import { prisma } from "@/lib/prisma"

const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"]
// 클라이언트가 320px로 축소해 보내므로 실제로는 수십 KB 수준이다.
// 이 한도는 클라이언트를 거치지 않은 직접 호출로 거대한 base64가 DB에 들어가는
// 것을 막기 위한 상한이다.
const MAX_SIZE = 4 * 1024 * 1024

export async function POST(req: NextRequest) {
  const session = await getServerSession()
  if (!session?.user?.id || session.user.role !== "WORKER") {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 401 })
  }

  const profile = await prisma.workerProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  })
  if (!profile) {
    return NextResponse.json({ error: "프로필이 없습니다." }, { status: 404 })
  }

  const formData = await req.formData()
  const file = formData.get("file") as File | null
  if (!file) {
    return NextResponse.json({ error: "파일이 없습니다." }, { status: 400 })
  }
  if (!ALLOWED_MIME.includes(file.type)) {
    return NextResponse.json({ error: "JPG, PNG, WEBP 파일만 업로드 가능합니다." }, { status: 400 })
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "파일 크기는 4MB 이하여야 합니다." }, { status: 400 })
  }

  // 컨테이너 로컬 디스크(public/uploads)는 재배포 시 초기화되어 파일이 사라지므로
  // (근로계약서 서명 이미지와 동일하게) DB에 base64로 직접 저장한다.
  const bytes = await file.arrayBuffer()
  const url = `data:${file.type};base64,${Buffer.from(bytes).toString("base64")}`

  await prisma.workerProfile.update({
    where: { id: profile.id },
    data: { profileImageUrl: url },
  })

  return NextResponse.json({ url })
}
