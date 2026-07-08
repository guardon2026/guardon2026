import { prisma } from "@/lib/prisma"
import { getServerSession } from "@/lib/session"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Receipt } from "lucide-react"
import { StatusBadge } from "@/components/ui/status-badge"
import { SOS_STATUS_LABELS, WORK_FIELD_LABELS, CREDENTIAL_LABELS } from "@/lib/constants"
import type { StatusVariant } from "@/components/ui/status-badge"

const SOS_STATUS_VARIANT: Record<string, StatusVariant> = {
  DISPATCHING: "active",
  PENDING:     "pending",
  CONFIRMED:   "confirmed",
  UNRESOLVED:  "unresolved",
  CANCELLED:   "inactive",
  COMPLETED:   "approved",
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex gap-3 text-sm py-2 border-b border-gray-50 last:border-0">
      <span className="text-gray-400 w-32 shrink-0">{label}</span>
      <span className="text-gray-800 font-medium">{value}</span>
    </div>
  )
}

interface ReceiptInfo {
  type: "CASH_RECEIPT" | "TAX_INVOICE"
  // 현금영수증
  purpose?: "INCOME" | "EXPENSE"
  number?: string
  // 세금계산서
  businessNumber?: string
  companyName?: string
  ceoName?: string
  email?: string
}

export default async function AdminSosDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const session = await getServerSession()
  if (!session || session.user.role !== "ADMIN") redirect("/login")

  const sos = await prisma.sosRequest.findUnique({
    where: { id },
    include: {
      company: { select: { name: true, phone: true, address: true } },
      sosMatches: {
        include: {
          workerProfile: {
            include: { user: { select: { name: true, phone: true } } },
          },
        },
        orderBy: { notifiedAt: "desc" },
      },
    },
  })

  if (!sos) notFound()

  const receiptInfo = sos.receiptInfo as ReceiptInfo | null
  const laborCost = sos.hourlyRate * sos.requiredCount
  const serviceFee = Math.ceil(laborCost * 0.05)
  const vat = Math.ceil((laborCost + serviceFee) * 0.1)

  return (
    <div className="space-y-6 pb-10 max-w-3xl">
      <Link
        href="/sos-monitor"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        SOS 모니터로 돌아가기
      </Link>

      {/* 헤더 */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs text-gray-400 mb-1">{sos.company.name}</p>
            <h1 className="text-lg font-bold text-gray-900">{sos.title}</h1>
            <p className="text-xs text-gray-400 mt-1">
              {sos.createdAt.toLocaleString("ko-KR", {
                year: "numeric", month: "long", day: "numeric",
                hour: "2-digit", minute: "2-digit",
              })} 접수
            </p>
          </div>
          <StatusBadge
            variant={SOS_STATUS_VARIANT[sos.status] ?? "pending"}
            label={SOS_STATUS_LABELS[sos.status] ?? sos.status}
          />
        </div>
      </div>

      {/* 기본 정보 */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">요청 정보</p>
        <InfoRow label="집결지" value={sos.locationAddress} />
        <InfoRow label="배치 시작" value={sos.scheduledAt.toLocaleString("ko-KR", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })} />
        {sos.scheduledEndAt && (
          <InfoRow label="배치 종료" value={sos.scheduledEndAt.toLocaleString("ko-KR", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })} />
        )}
        <InfoRow label="필요 인원" value={`${sos.requiredCount}명`} />
        <InfoRow label="업무 분야" value={sos.requiredFields.map((f) => (WORK_FIELD_LABELS as Record<string, string>)[f] ?? f).join(", ") || "-"} />
        {sos.requiredCredentials.length > 0 && (
          <InfoRow label="필요 자격증" value={sos.requiredCredentials.map((c) => (CREDENTIAL_LABELS as Record<string, string>)[c] ?? c).join(", ")} />
        )}
        <InfoRow label="일급" value={`${sos.hourlyRate.toLocaleString()}원/일`} />
        {sos.dressCode && <InfoRow label="복장 규정" value={sos.dressCode} />}
        {sos.description && <InfoRow label="추가 설명" value={sos.description} />}
      </div>

      {/* 수수료 내역 */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">결제 내역</p>
        <InfoRow label="인건비" value={`${laborCost.toLocaleString()}P`} />
        <InfoRow label="SOS 긴급 요청 서비스 비용 (5%)" value={`${serviceFee.toLocaleString()}P`} />
        <InfoRow label="부가세 (인건비 + 서비스 비용의 10%)" value={`${vat.toLocaleString()}P`} />
        <InfoRow label="총 결제" value={<span className="text-brand font-bold">{(laborCost + vat + serviceFee).toLocaleString()}P</span>} />
      </div>

      {/* 영수증 발행 정보 — 관리자 전용 */}
      <div className={`rounded-2xl border shadow-sm p-5 ${receiptInfo ? "bg-amber-50 border-amber-200" : "bg-white border-gray-100"}`}>
        <div className="flex items-center gap-2 mb-3">
          <Receipt className="w-4 h-4 text-amber-600" />
          <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">지출 영수증 발행 정보 (관리자 전용)</p>
        </div>

        {!receiptInfo || receiptInfo.type === undefined ? (
          <p className="text-sm text-gray-400">발행 요청 없음</p>
        ) : receiptInfo.type === "CASH_RECEIPT" ? (
          <div>
            <InfoRow label="발행 유형" value="현금영수증" />
            <InfoRow label="용도" value={receiptInfo.purpose === "INCOME" ? "소득공제용" : "지출증빙용"} />
            <InfoRow label="번호" value={receiptInfo.number ?? "-"} />
          </div>
        ) : (
          <div>
            <InfoRow label="발행 유형" value="세금계산서" />
            <InfoRow label="사업자등록번호" value={receiptInfo.businessNumber ?? "-"} />
            <InfoRow label="상호" value={receiptInfo.companyName ?? "-"} />
            <InfoRow label="대표자명" value={receiptInfo.ceoName ?? "-"} />
            <InfoRow label="이메일" value={receiptInfo.email ?? "-"} />
          </div>
        )}
      </div>

      {/* 매칭 현황 */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
          매칭 현황 ({sos.sosMatches.length}명 통보)
        </p>
        {sos.sosMatches.length === 0 ? (
          <p className="text-sm text-gray-400">매칭된 인력 없음</p>
        ) : (
          <div className="space-y-2">
            {sos.sosMatches.map((m) => (
              <div key={m.id} className="flex items-center justify-between text-sm py-2 border-b border-gray-50 last:border-0">
                <div>
                  <span className="font-medium text-gray-900">{m.workerProfile.user.name ?? "이름 없음"}</span>
                  {m.workerProfile.user.phone && (
                    <span className="ml-2 text-gray-400 text-xs">{m.workerProfile.user.phone}</span>
                  )}
                </div>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  m.status === "CONFIRMED" ? "bg-green-100 text-green-700" :
                  m.status === "ACCEPTED"  ? "bg-blue-100 text-blue-700" :
                  m.status === "REJECTED"  ? "bg-red-100 text-red-600" :
                  "bg-gray-100 text-gray-500"
                }`}>
                  {m.status === "NOTIFIED" ? "통보됨" : m.status === "ACCEPTED" ? "수락" : m.status === "CONFIRMED" ? "확정" : "거절"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
