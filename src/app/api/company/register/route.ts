import { getServerSession } from "@/lib/session"
import { prisma } from "@/lib/prisma"

// POST /api/company/register
export async function POST(request: Request) {
  // 1. 세션 인증 확인
  const session = await getServerSession()
  if (!session?.user?.id) {
    return Response.json({ error: "인증이 필요합니다." }, { status: 401 })
  }

  // 2. 역할 확인: COMPANY_OWNER만 허용
  if (session.user.role !== "COMPANY_OWNER") {
    return Response.json(
      { error: "업체 대표 계정만 업체를 등록할 수 있습니다." },
      { status: 403 }
    )
  }

  // 3. 이미 업체 등록 여부 확인 (ownerId unique constraint 사전 방어)
  const existing = await prisma.company.findUnique({
    where: { ownerId: session.user.id },
  })
  if (existing) {
    return Response.json(
      { error: "이미 업체가 등록되어 있습니다.", code: "ALREADY_REGISTERED" },
      { status: 409 }
    )
  }

  // 4. 요청 바디 파싱
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return Response.json(
      { error: "요청 형식이 올바르지 않습니다.", code: "INVALID_JSON" },
      { status: 400 }
    )
  }

  const { name, licenseNumber, address, city, district, phone, description } =
    body as {
      name?: string
      licenseNumber?: string
      address?: string
      city?: string
      district?: string
      phone?: string
      description?: string
    }

  // 5. 서버 사이드 검증 (클라이언트 우회 방어)
  if (!name || !licenseNumber || !address || !city || !district || !phone) {
    return Response.json(
      { error: "필수 항목을 모두 입력해 주세요.", code: "MISSING_FIELDS" },
      { status: 400 }
    )
  }

  const licenseRegex = /^[\d가-힣\-]+$/
  if (!licenseRegex.test(licenseNumber) || licenseNumber.length < 5) {
    return Response.json(
      {
        error: "허가번호 형식이 올바르지 않습니다.",
        field: "licenseNumber",
        code: "INVALID_LICENSE_FORMAT",
      },
      { status: 400 }
    )
  }

  // 6. 허가번호 중복 확인
  const duplicate = await prisma.company.findUnique({
    where: { licenseNumber },
  })
  if (duplicate) {
    return Response.json(
      { error: "이미 등록된 허가번호입니다.", code: "LICENSE_DUPLICATE" },
      { status: 409 }
    )
  }

  // 7. Company 생성 (status=PENDING, isActive=false)
  try {
    const company = await prisma.company.create({
      data: {
        ownerId: session.user.id,
        name,
        licenseNumber,
        address,
        city,
        district,
        phone,
        description: description ?? null,
        status: "APPROVED",
        isActive: true,
        licenseVerified: false,
        approvedAt: new Date(),
      },
    })

    return Response.json(
      { id: company.id, status: company.status },
      { status: 201 }
    )
  } catch (err: unknown) {
    // DB unique constraint 위반 (race condition 방어)
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code: string }).code === "P2002"
    ) {
      return Response.json(
        { error: "이미 등록된 허가번호입니다.", code: "LICENSE_DUPLICATE" },
        { status: 409 }
      )
    }
    console.error("[company/register] DB error:", err)
    return Response.json(
      { error: "일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요." },
      { status: 500 }
    )
  }
}
