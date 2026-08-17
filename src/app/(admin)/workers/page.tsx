import { prisma } from "@/lib/prisma"
import { getServerSession } from "@/lib/session"
import { redirect } from "next/navigation"
import { Users } from "lucide-react"
import { PageHeader } from "@/components/ui/page-header"
import { DataTable } from "@/components/ui/data-table"
import { StatusBadge } from "@/components/ui/status-badge"
import { EmptyState } from "@/components/ui/empty-state"
import { WORK_FIELD_LABELS, AVAILABILITY_LABELS, type WorkFieldKey, type AvailabilityStatusKey } from "@/lib/constants"
import type { StatusVariant } from "@/components/ui/status-badge"
import UnsuspendButton from "./UnsuspendButton"

const AVAILABILITY_VARIANT: Record<string, StatusVariant> = {
  AVAILABLE: "approved",
  BUSY: "pending",
  UNAVAILABLE: "inactive",
}

export default async function AdminWorkersPage() {
  const session = await getServerSession()
  if (!session || session.user.role !== "ADMIN") redirect("/login")

  const workers = await prisma.workerProfile.findMany({
    include: {
      user: { select: { name: true, phone: true, email: true, deletedAt: true } },
      credentials: { where: { status: "APPROVED" }, select: { id: true } },
    },
    orderBy: { createdAt: "desc" },
  })
  // noShowCount/suspendedAt은 위 include로 이미 전체 스칼라 필드가 포함되어 별도 select 불필요

  const filtered = workers.filter((w) => w.user.deletedAt === null)

  type WorkerRow = {
    id: string
    name: string
    contact: string
    region: string
    workFields: string
    experienceYears: string
    credentialCount: number
    availability: React.ReactNode
    noShowCount: React.ReactNode
    status: React.ReactNode
    createdAt: string
  }

  const rows: WorkerRow[] = filtered.map((w) => ({
    id: w.id,
    name: w.user.name ?? "-",
    contact: w.user.phone ?? w.user.email ?? "-",
    region: [w.city, w.district].filter(Boolean).join(" ") || "-",
    workFields: w.workFields.map((f) => WORK_FIELD_LABELS[f as WorkFieldKey] ?? f).join(", ") || "-",
    experienceYears: `${w.experienceYears}년`,
    credentialCount: w.credentials.length,
    availability: (
      <StatusBadge
        variant={AVAILABILITY_VARIANT[w.availability] ?? "inactive"}
        label={AVAILABILITY_LABELS[w.availability as AvailabilityStatusKey] ?? w.availability}
      />
    ),
    noShowCount: (
      <span className={w.noShowCount >= 3 ? "text-red-600 font-semibold" : "text-gray-600"}>
        {w.noShowCount}회
      </span>
    ),
    status: w.suspendedAt ? (
      <div className="flex items-center gap-2">
        <StatusBadge variant="rejected" label="이용 정지" />
        <UnsuspendButton workerId={w.id} />
      </div>
    ) : (
      <StatusBadge variant="approved" label="정상" />
    ),
    createdAt: w.createdAt.toLocaleDateString("ko-KR"),
  }))

  return (
    <div className="space-y-6">
      <PageHeader
        title="경비 인력 관리"
        subtitle="가입한 경비 인력 목록을 확인합니다."
        badge={{ label: `총 ${filtered.length}명`, variant: "default" }}
      />

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState icon={Users} title="등록된 경비 인력이 없습니다" description="아직 프로필을 등록한 경비 인력이 없습니다." />
        ) : (
          <DataTable<WorkerRow>
            columns={[
              { key: "name", label: "이름" },
              { key: "contact", label: "연락처" },
              { key: "region", label: "지역" },
              { key: "workFields", label: "업무 분야" },
              { key: "experienceYears", label: "경력" },
              { key: "credentialCount", label: "인증 자격증" },
              { key: "availability", label: "가용 상태", render: (row) => row.availability },
              { key: "noShowCount", label: "노쇼", render: (row) => row.noShowCount },
              { key: "status", label: "상태", render: (row) => row.status },
              { key: "createdAt", label: "가입일" },
            ]}
            data={rows}
            emptyMessage="등록된 경비 인력이 없습니다."
          />
        )}
      </div>
    </div>
  )
}
