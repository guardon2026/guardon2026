export const dynamic = 'force-dynamic'
import { NextResponse } from "next/server"
import { getServerSession } from "@/lib/session"

/** 현재 요청의 로그인 세션 정보를 그대로 보여준다 — 본인 계정 진단용. */
export async function GET() {
  const session = await getServerSession()
  if (!session?.user) {
    return NextResponse.json({ loggedIn: false })
  }
  return NextResponse.json({
    loggedIn: true,
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    role: session.user.role,
  })
}
