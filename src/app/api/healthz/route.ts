export const dynamic = 'force-dynamic'

export async function GET() {
  const env = {
    hasSecret: !!process.env.NEXTAUTH_SECRET,
    hasClientId: !!process.env.KAKAO_CLIENT_ID,
    clientIdPrefix: process.env.KAKAO_CLIENT_ID?.slice(0, 6),
    hasClientSecret: !!process.env.KAKAO_CLIENT_SECRET,
    hasDatabaseUrl: !!process.env.DATABASE_URL,
    dbUrlPrefix: process.env.DATABASE_URL?.slice(0, 30),
    nodeEnv: process.env.NODE_ENV,
  }

  let db: { status: string; error?: string } = { status: 'untested' }
  try {
    const { prisma } = await import('@/lib/prisma')
    const count = await prisma.user.count()
    db = { status: 'ok', error: String(count) }
  } catch (e: unknown) {
    db = { status: 'error', error: e instanceof Error ? e.message : String(e) }
  }

  return Response.json({ env, db })
}
