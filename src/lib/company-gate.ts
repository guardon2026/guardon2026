import { prisma } from "@/lib/prisma"
import type { Company } from "@prisma/client"

/**
 * 업체 승인 상태가 아닐 때 throw되는 에러.
 * Phase 5 SOS/검색 Route Handler에서 requireApprovedCompany 호출 시 사용.
 */
export class CompanyNotApprovedError extends Error {
  constructor(public readonly status: "PENDING" | "REJECTED" | "NONE") {
    super(`업체 승인 상태가 아닙니다: ${status}`)
    this.name = "CompanyNotApprovedError"
  }
}

/**
 * APPROVED 업체를 반환하거나 CompanyNotApprovedError를 throw한다.
 * Phase 5 SOS·검색 Route Handler, Phase 3 layout.tsx에서 사용.
 *
 * @param userId - 세션에서 추출한 User.id
 * @throws CompanyNotApprovedError — status가 PENDING/REJECTED이거나 업체가 없는 경우
 */
export async function requireApprovedCompany(userId: string): Promise<Company> {
  const company = await prisma.company.findUnique({
    where: { ownerId: userId },
  })

  if (!company) {
    throw new CompanyNotApprovedError("NONE")
  }

  if (company.status !== "APPROVED") {
    throw new CompanyNotApprovedError(
      company.status as "PENDING" | "REJECTED"
    )
  }

  return company
}

/**
 * 업체 상태만 조회 (throw 없이 nullable 반환).
 * layout.tsx의 상태 분기 렌더링에 사용.
 */
export async function getCompanyStatus(
  userId: string
): Promise<{ status: "PENDING" | "APPROVED" | "REJECTED" | "NONE"; name?: string }> {
  const company = await prisma.company.findUnique({
    where: { ownerId: userId },
    select: { status: true, name: true },
  })

  if (!company) return { status: "NONE" }
  return { status: company.status, name: company.name }
}
