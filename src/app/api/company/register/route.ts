export const dynamic = 'force-dynamic'
import { getServerSession } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { saveCompanyDocument } from "@/lib/company-documents"

// POST /api/company/register
export async function POST(request: Request) {
  // 1. ?¸ì…˜ ?¸ì¦ ?•ì¸
  const session = await getServerSession()
  if (!session?.user?.id) {
    return Response.json({ error: "?¸ì¦???„ìš”?©ë‹ˆ??" }, { status: 401 })
  }

  // 2. ??•  ?•ì¸: COMPANY_OWNERë§??ˆìš©
  if (session.user.role !== "COMPANY_OWNER") {
    return Response.json(
      { error: "?…ì²´ ?€??ê³„ì •ë§??…ì²´ë¥??±ë¡?????ˆìŠµ?ˆë‹¤." },
      { status: 403 }
    )
  }

  // 3. ?´ë? ?¹ì¸???…ì²´ ?±ë¡ ?¬ë? ?•ì¸ (ownerId unique constraint ?¬ì „ ë°©ì–´)
  const existing = await prisma.company.findUnique({
    where: { ownerId: session.user.id },
  })
  if (existing?.status === "APPROVED") {
    return Response.json(
      { error: "?´ë? ?¹ì¸???…ì²´ê°€ ?±ë¡?˜ì–´ ?ˆìŠµ?ˆë‹¤.", code: "ALREADY_REGISTERED" },
      { status: 409 }
    )
  }

  // 4. ?”ì²­ ë°”ë”” ?Œì‹± (?¬ì—…?ë“±ë¡ì¦Â·ê²½ë¹„??ì¦ë¹™ ?Œì¼ ?¬í•¨)
  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return Response.json(
      { error: "?”ì²­ ?•ì‹???¬ë°”ë¥´ì? ?ŠìŠµ?ˆë‹¤.", code: "INVALID_FORM_DATA" },
      { status: 400 }
    )
  }

  const name = String(formData.get("name") ?? "").trim()
  const licenseNumber = String(formData.get("licenseNumber") ?? "").trim()
  const businessRegistrationNumber = String(formData.get("businessRegistrationNumber") ?? "").trim()
  const address = String(formData.get("address") ?? "").trim()
  const city = String(formData.get("city") ?? "").trim()
  const district = String(formData.get("district") ?? "").trim()
  const phone = String(formData.get("phone") ?? "").trim()
  const description = String(formData.get("description") ?? "").trim()
  const kakaoOpenChatUrl = String(formData.get("kakaoOpenChatUrl") ?? "").trim()
  const businessRegistrationFile = formData.get("businessRegistrationFile")
  const securityLicenseFile = formData.get("securityLicenseFile")
  const additionalProofFiles = formData
    .getAll("additionalProofFiles")
    .filter((file): file is File => file instanceof File && file.size > 0)

  // 5. ?œë²„ ?¬ì´??ê²€ì¦?(?´ë¼?´ì–¸???°íšŒ ë°©ì–´)
  if (!name || !licenseNumber || !businessRegistrationNumber || !address || !city || !district || !phone) {
    return Response.json(
      { error: "?„ìˆ˜ ??ª©??ëª¨ë‘ ?…ë ¥??ì£¼ì„¸??", code: "MISSING_FIELDS" },
      { status: 400 }
    )
  }

  const licenseRegex = /^[\dê°€-??-]+$/
  if (!licenseRegex.test(licenseNumber) || licenseNumber.length < 5) {
    return Response.json(
      {
        error: "?ˆê?ë²ˆí˜¸ ?•ì‹???¬ë°”ë¥´ì? ?ŠìŠµ?ˆë‹¤.",
        field: "licenseNumber",
        code: "INVALID_LICENSE_FORMAT",
      },
      { status: 400 }
    )
  }

  const businessNumberRegex = /^\d{3}-?\d{2}-?\d{5}$/
  if (!businessNumberRegex.test(businessRegistrationNumber)) {
    return Response.json(
      {
        error: "?¬ì—…?ë“±ë¡ë²ˆ???•ì‹???¬ë°”ë¥´ì? ?ŠìŠµ?ˆë‹¤.",
        field: "businessRegistrationNumber",
        code: "INVALID_BUSINESS_NUMBER_FORMAT",
      },
      { status: 400 }
    )
  }

  if (!(businessRegistrationFile instanceof File) || businessRegistrationFile.size === 0) {
    return Response.json(
      {
        error: "?¬ì—…?ë“±ë¡ì¦ ?Œì¼???…ë¡œ?œí•´ ì£¼ì„¸??",
        field: "businessRegistrationFile",
        code: "BUSINESS_DOCUMENT_REQUIRED",
      },
      { status: 400 }
    )
  }

  if (!(securityLicenseFile instanceof File) || securityLicenseFile.size === 0) {
    return Response.json(
      {
        error: "ê²½ë¹„???ˆê? ?ëŠ” ê²½í˜¸ ê°€??ì¦ë¹™ ?Œì¼???…ë¡œ?œí•´ ì£¼ì„¸??",
        field: "securityLicenseFile",
        code: "SECURITY_DOCUMENT_REQUIRED",
      },
      { status: 400 }
    )
  }

  // 6. ?ˆê?ë²ˆí˜¸ ì¤‘ë³µ ?•ì¸
  const duplicate = await prisma.company.findUnique({
    where: { licenseNumber },
  })
  if (duplicate && duplicate.ownerId !== session.user.id) {
    return Response.json(
      { error: "?´ë? ?±ë¡???ˆê?ë²ˆí˜¸?…ë‹ˆ??", code: "LICENSE_DUPLICATE" },
      { status: 409 }
    )
  }

  // 7. Company ?ì„± ?ëŠ” ?¬ì‹ ì²?ê°±ì‹  (status=PENDING, isActive=false)
  try {
    const [businessRegistrationFileUrl, securityLicenseFileUrl, ...additionalProofFileUrls] =
      await Promise.all([
        saveCompanyDocument(businessRegistrationFile, session.user.id, "business-registration"),
        saveCompanyDocument(securityLicenseFile, session.user.id, "security-proof"),
        ...additionalProofFiles.map((file, index) =>
          saveCompanyDocument(file, session.user.id, `additional-proof-${index + 1}`)
        ),
      ])

    const data = {
      name,
      licenseNumber,
      businessRegistrationNumber,
      businessRegistrationFileUrl,
      securityLicenseFileUrl,
      additionalProofFileUrls,
      address,
      city,
      district,
      phone,
      description: description || null,
      kakaoOpenChatUrl: kakaoOpenChatUrl || null,
      status: "PENDING" as const,
      isActive: false,
      licenseVerified: false,
      approvedAt: null,
      rejectedAt: null,
      rejectionReason: null,
      reviewedAt: null,
    }

    const company = existing
      ? await prisma.company.update({
          where: { ownerId: session.user.id },
          data,
        })
      : await prisma.company.create({
          data: {
            ownerId: session.user.id,
            ...data,
          },
        })

    await prisma.$transaction([
      prisma.companyDocument.deleteMany({ where: { companyId: company.id } }),
      prisma.companyDocument.createMany({
        data: [
          {
            companyId: company.id,
            type: "BUSINESS_REGISTRATION",
            fileUrl: businessRegistrationFileUrl,
            fileName: businessRegistrationFile.name,
            mimeType: businessRegistrationFile.type,
          },
          {
            companyId: company.id,
            type: "SECURITY_LICENSE",
            fileUrl: securityLicenseFileUrl,
            fileName: securityLicenseFile.name,
            mimeType: securityLicenseFile.type,
          },
          ...additionalProofFiles.map((file, index) => ({
            companyId: company.id,
            type: "ADDITIONAL_PROOF",
            fileUrl: additionalProofFileUrls[index],
            fileName: file.name,
            mimeType: file.type,
          })),
        ],
      }),
    ])

    return Response.json(
      { id: company.id, status: company.status },
      { status: existing ? 200 : 201 }
    )
  } catch (err: unknown) {
    // DB unique constraint ?„ë°˜ (race condition ë°©ì–´)
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code: string }).code === "P2002"
    ) {
      return Response.json(
        { error: "?´ë? ?±ë¡???ˆê?ë²ˆí˜¸?…ë‹ˆ??", code: "LICENSE_DUPLICATE" },
        { status: 409 }
      )
    }

    if (err instanceof Error) {
      return Response.json(
        { error: err.message },
        { status: 400 }
      )
    }

    console.error("[company/register] DB error:", err)
    return Response.json(
      { error: "?¼ì‹œ?ì¸ ?¤ë¥˜ê°€ ë°œìƒ?ˆìŠµ?ˆë‹¤. ? ì‹œ ???¤ì‹œ ?œë„??ì£¼ì„¸??" },
      { status: 500 }
    )
  }
}
