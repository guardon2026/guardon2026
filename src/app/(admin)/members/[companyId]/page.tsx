import { prisma } from "@/lib/prisma"
import { getServerSession } from "@/lib/session"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { PageHeader } from "@/components/ui/page-header"
import { StatusBadge } from "@/components/ui/status-badge"
import { CompanyActionButtons } from "@/components/admin/CompanyActionButtons"
import { ADMIN_LABELS, COMPANY_STATUS_LABELS } from "@/lib/constants"
import type { StatusVariant } from "@/components/ui/status-badge"

const STATUS_VARIANT: Record<string, StatusVariant> = {
  PENDING:  "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
}

export default async function AdminCompanyDetailPage({
  params,
}: {
  params: Promise<{ companyId: string }>
}) {
  const session = await getServerSession()
  if (!session || session.user.role !== "ADMIN") redirect("/login")

  const { companyId } = await params

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    include: { owner: true },
  })

  if (!company) notFound()

  const infoFields = [
    { label: "업체명",          value: company.name },
    { label: "경비업 허가번호",  value: company.licenseNumber },
    { label: "대표자",           value: company.owner.name },
    { label: "대표자 연락처",    value: company.owner.phone ?? "-" },
    { label: "업체 전화번호",    value: company.phone },
    { label: "신청일",           value: company.createdAt.toLocaleDateString("ko-KR") },
    { label: "시·도",            value: company.city },
    { label: "구·군",            value: company.district },
  ]

  return (
    <div className="space-y-6">
      {/* 뒤로가기 */}
      <Link
        href="/members"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        목록으로
      </Link>

      <PageHeader
        title={company.name}
        subtitle={`신청일: ${company.createdAt.toLocaleDateString("ko-KR")}`}
        badge={{
          label: COMPANY_STATUS_LABELS[company.status] ?? company.status,
          variant:
            company.status === "APPROVED"
              ? "success"
              : company.status === "REJECTED"
              ? "danger"
              : "warning",
        }}
      />

      {/* 업체 정보 카드 (2컬럼 그리드) */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">기본 정보</h2>
        <div className="grid grid-cols-2 gap-x-8 gap-y-5">
          {infoFields.map(({ label, value }) => (
            <div key={label}>
              <p className="text-xs text-gray-400 mb-1">{label}</p>
              <p className="text-sm font-medium text-gray-900">{value}</p>
            </div>
          ))}
          <div className="col-span-2">
            <p className="text-xs text-gray-400 mb-1">주소</p>
            <p className="text-sm font-medium text-gray-900">{company.address}</p>
          </div>
          {company.description && (
            <div className="col-span-2">
              <p className="text-xs text-gray-400 mb-1">업체 소개</p>
              <p className="text-sm text-gray-700">{company.description}</p>
            </div>
          )}
        </div>
      </div>

      {/* 심사 액션 카드 */}
      {company.status === "PENDING" && (
        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">심사 처리</h2>
          <CompanyActionButtons companyId={company.id} />
        </div>
      )}

      {/* 승인 완료 상태 */}
      {company.status === "APPROVED" && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-6">
          <div className="flex items-center gap-3">
            <StatusBadge variant="approved" label="승인 완료" />
            <p className="text-sm text-green-800">
              이 업체는 승인되어 서비스를 이용 중입니다.
            </p>
          </div>
        </div>
      )}

      {/* 반려 상태 */}
      {company.status === "REJECTED" && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <StatusBadge variant="rejected" label="반려됨" />
          </div>
          <p className="text-sm text-red-800">
            이 업체 등록 신청은 반려 처리되었습니다.
          </p>
        </div>
      )}
    </div>
  )
}
