import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "@/lib/session"
import { UserRole, SosMatchStatus } from "@prisma/client"
import { sendKakaoMessages } from "@/lib/kakao-message"

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://guardon.kr"

type Params = { params: Promise<{ matchId: string }> }

// GET /api/contracts/[matchId] — 계약서 조회
export async function GET(_req: NextRequest, { params }: Params) {
  const { matchId } = await params
  const session = await getServerSession()
  if (!session?.user?.id) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 })

  const match = await prisma.sosMatch.findUnique({
    where: { id: matchId },
    include: {
      sosRequest: {
        include: { company: { select: { ownerId: true } } },
      },
      workerProfile: { select: { userId: true } },
      workContract: true,
    },
  })
  if (!match) return NextResponse.json({ error: "매치를 찾을 수 없습니다." }, { status: 404 })

  const isCompany = match.sosRequest.company.ownerId === session.user.id
  const isWorker  = match.workerProfile.userId === session.user.id
  const isAdmin   = session.user.role === UserRole.ADMIN
  if (!isCompany && !isWorker && !isAdmin) {
    return NextResponse.json({ error: "접근 권한이 없습니다." }, { status: 403 })
  }

  return NextResponse.json({ contract: match.workContract, match: { status: match.status } })
}

// PATCH /api/contracts/[matchId] — 계약서 정보 입력 + 서명
export async function PATCH(req: NextRequest, { params }: Params) {
  const { matchId } = await params
  const session = await getServerSession()
  if (!session?.user?.id) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 })

  const match = await prisma.sosMatch.findUnique({
    where: { id: matchId },
    include: {
      sosRequest: { select: { id: true, title: true, company: { select: { ownerId: true } } } },
      workerProfile: { select: { userId: true } },
      workContract: true,
    },
  })
  if (!match) return NextResponse.json({ error: "매치를 찾을 수 없습니다." }, { status: 404 })
  if (match.status !== SosMatchStatus.CONFIRMED) {
    return NextResponse.json({ error: "확정된 매치에서만 계약서를 작성할 수 있습니다." }, { status: 409 })
  }

  const isCompany = match.sosRequest.company.ownerId === session.user.id
  const isWorker  = match.workerProfile.userId === session.user.id
  if (!isCompany && !isWorker) {
    return NextResponse.json({ error: "접근 권한이 없습니다." }, { status: 403 })
  }

  const body = await req.json()
  const now = new Date()

  if (isCompany) {
    const { employerBizNumber, employerName, employerCeoName, employerAddress, sign } = body
    const contract = await prisma.workContract.upsert({
      where: { sosMatchId: matchId },
      create: {
        sosMatchId: matchId,
        sosRequestId: match.sosRequest.id,
        employerBizNumber: employerBizNumber?.trim() || null,
        employerName: employerName?.trim() || null,
        employerCeoName: employerCeoName?.trim() || null,
        employerAddress: employerAddress?.trim() || null,
        employerSignedAt: sign ? now : null,
      },
      update: {
        employerBizNumber: employerBizNumber?.trim() || null,
        employerName: employerName?.trim() || null,
        employerCeoName: employerCeoName?.trim() || null,
        employerAddress: employerAddress?.trim() || null,
        ...(sign && { employerSignedAt: now }),
      },
    })

    // 양쪽 서명 완료 시 카카오 메시지 발송
    if (sign && match.workContract?.workerSignedAt) {
      await notifyBothParties(match, matchId)
    }

    return NextResponse.json({ contract })
  }

  // isWorker
  const { workerRealName, workerBirthDate, workerAddress, workerPhone, workerBankName, workerAccountNum, workerAccountHolder, sign } = body
  const contract = await prisma.workContract.upsert({
    where: { sosMatchId: matchId },
    create: {
      sosMatchId: matchId,
      sosRequestId: match.sosRequest.id,
      workerRealName: workerRealName?.trim() || null,
      workerBirthDate: workerBirthDate?.trim() || null,
      workerAddress: workerAddress?.trim() || null,
      workerPhone: workerPhone?.trim() || null,
      workerBankName: workerBankName?.trim() || null,
      workerAccountNum: workerAccountNum?.trim() || null,
      workerAccountHolder: workerAccountHolder?.trim() || null,
      workerSignedAt: sign ? now : null,
    },
    update: {
      workerRealName: workerRealName?.trim() || null,
      workerBirthDate: workerBirthDate?.trim() || null,
      workerAddress: workerAddress?.trim() || null,
      workerPhone: workerPhone?.trim() || null,
      workerBankName: workerBankName?.trim() || null,
      workerAccountNum: workerAccountNum?.trim() || null,
      workerAccountHolder: workerAccountHolder?.trim() || null,
      ...(sign && { workerSignedAt: now }),
    },
  })

  // 양쪽 서명 완료 시 카카오 메시지 발송
  if (sign && match.workContract?.employerSignedAt) {
    await notifyBothParties(match, matchId)
  }

  return NextResponse.json({ contract })
}

async function notifyBothParties(
  match: {
    sosRequest: { id: string; title: string; company: { ownerId: string } }
    workerProfile: { userId: string }
  },
  matchId: string,
) {
  const employerUrl = `${BASE_URL}/sos/${match.sosRequest.id}/contract/${matchId}`
  const workerUrl   = `${BASE_URL}/worker-history/${matchId}/contract`
  const title = `근로계약서 서명 완료 — ${match.sosRequest.title}`

  sendKakaoMessages([
    {
      userId: match.sosRequest.company.ownerId,
      title,
      body: `양측 서명이 완료되어 계약서가 유효합니다.\n계약서 확인: ${employerUrl}\n(브라우저 인쇄로 PDF 저장 가능)`,
    },
    {
      userId: match.workerProfile.userId,
      title,
      body: `양측 서명이 완료되어 계약서가 유효합니다.\n계약서 확인: ${workerUrl}\n(브라우저 인쇄로 PDF 저장 가능)`,
    },
  ])
}
