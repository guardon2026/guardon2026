export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/session"
import { prisma } from "@/lib/prisma"

// GET /api/company/documents/[id] — 회사 제출 서류 파일을 DB에서 직접 내려준다
// 열람 가능: 관리자, 또는 서류를 제출한 업체 대표 본인
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 })
  }

  const { id } = await params

  const doc = await prisma.companyDocument.findUnique({
    where: { id },
    select: {
      fileData: true,
      fileName: true,
      mimeType: true,
      company: { select: { ownerId: true } },
    },
  })

  if (!doc || !doc.fileData) {
    return NextResponse.json({ error: "파일을 찾을 수 없습니다." }, { status: 404 })
  }

  const isAdmin = session.user.role === "ADMIN"
  const isOwner = session.user.id === doc.company.ownerId
  if (!isAdmin && !isOwner) {
    return NextResponse.json({ error: "접근 권한이 없습니다." }, { status: 403 })
  }

  return new NextResponse(new Uint8Array(doc.fileData), {
    headers: {
      "Content-Type": doc.mimeType ?? "application/octet-stream",
      "Content-Disposition": `inline; filename="${encodeURIComponent(doc.fileName ?? "document")}"`,
      "Cache-Control": "private, no-store",
    },
  })
}
