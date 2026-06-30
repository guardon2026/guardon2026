import { prisma } from "@/lib/prisma"
import { getServerSession } from "@/lib/session"
import { redirect } from "next/navigation"
import Link from "next/link"
import { FileCheck2 } from "lucide-react"
import { PageHeader } from "@/components/ui/page-header"
import { EmptyState } from "@/components/ui/empty-state"
import { StatusBadge } from "@/components/ui/status-badge"
import { CredentialReviewList } from "@/components/admin/CredentialReviewList"
import { ADMIN_LABELS, CREDENTIAL_TYPE_LABELS } from "@/lib/constants"
import type { StatusVariant } from "@/components/ui/status-badge"

type TabKey = "PENDING" | "APPROVED" | "REJECTED"

interface SearchParams {
  tab?: string
}

const STATUS_VARIANT: Record<string, StatusVariant> = {
  PENDING:  "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
}

export default async function AdminCredentialsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const session = await getServerSession()
  if (!session || session.user.role !== "ADMIN") redirect("/login")

  const { tab } = await searchParams
  const currentTab: TabKey =
    tab === "APPROVED" || tab === "REJECTED" ? tab : "PENDING"

  const [credentials, pendingCount] = await Promise.all([
    prisma.credential.findMany({
      where: { status: currentTab },
      include: {
        workerProfile: {
          include: { user: { select: { name: true, phone: true, deletedAt: true } } },
        },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.credential.count({ where: { status: "PENDING" } }),
  ])

  // soft-delete된 사용자 제외 (PIPA)
  const active = credentials.filter((c) => c.workerProfile.user.deletedAt === null)

  const tabs: { key: TabKey; label: string }[] = [
    { key: "PENDING", label: "심사 대기" },
    { key: "APPROVED", label: "승인됨" },
    { key: "REJECTED", label: "반려됨" },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title={ADMIN_LABELS.CREDENTIAL_REVIEW}
        subtitle="제출된 자격증을 검토하고 승인 또는 반려합니다."
        badge={pendingCount > 0 ? { label: `${pendingCount}건 대기`, variant: "warning" } : undefined}
      />

      {/* 탭 */}
      <div className="flex gap-2">
        {tabs.map(({ key, label }) => (
          <Link
            key={key}
            href={`/credentials?tab=${key}`}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
              currentTab === key
                ? "bg-brand text-white"
                : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200"
            }`}
          >
            {label}
            {key === "PENDING" && pendingCount > 0 && (
              <span
                className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold ${
                  currentTab === key ? "bg-white/20 text-white" : "bg-sos text-white"
                }`}
              >
                {pendingCount}
              </span>
            )}
          </Link>
        ))}
      </div>

      {/* 콘텐츠 */}
      {currentTab === "PENDING" ? (
        active.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
            <EmptyState
              icon={FileCheck2}
              title={ADMIN_LABELS.EMPTY_PENDING}
              description="현재 심사 대기 중인 자격증이 없습니다."
            />
          </div>
        ) : (
          <CredentialReviewList credentials={active} />
        )
      ) : (
        /* APPROVED / REJECTED 탭: 읽기 전용 목록 */
        active.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
            <EmptyState
              icon={FileCheck2}
              title="자격증이 없습니다."
              description="해당 상태의 자격증이 없습니다."
            />
          </div>
        ) : (
          <div className="space-y-3">
            {active.map((cred) => (
              <div
                key={cred.id}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center justify-between"
              >
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    {CREDENTIAL_TYPE_LABELS[cred.type] ?? cred.type}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {cred.workerProfile.user.name}
                    {cred.workerProfile.user.phone && (
                      <span className="text-gray-400"> · {cred.workerProfile.user.phone}</span>
                    )}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    제출일: {new Date(cred.createdAt).toLocaleDateString("ko-KR")}
                  </p>
                  {cred.status === "REJECTED" && cred.rejectionReason && (
                    <p className="text-xs text-red-600 mt-1">반려 사유: {cred.rejectionReason}</p>
                  )}
                </div>
                <StatusBadge
                  variant={STATUS_VARIANT[cred.status] ?? "pending"}
                  label={
                    cred.status === "APPROVED"
                      ? "승인 완료"
                      : cred.status === "REJECTED"
                      ? "반려됨"
                      : "심사 중"
                  }
                />
              </div>
            ))}
          </div>
        )
      )}
    </div>
  )
}
