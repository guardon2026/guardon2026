"use client"

import { useEffect, useRef, useState } from "react"
import { PageHeader } from "@/components/ui/page-header"
import { StatusBadge } from "@/components/ui/status-badge"
import { EmptyState } from "@/components/ui/empty-state"
import { Award, Upload, CheckCircle, Clock, AlertCircle, Plus } from "lucide-react"
import {
  CREDENTIAL_LABELS,
  CREDENTIAL_TYPE_LABELS,
  CREDENTIAL_PAGE_LABELS,
  type CredentialTypeKey,
} from "@/lib/constants"

// MVP 4종만 업로드 허용
const MVP_CREDENTIAL_TYPES: CredentialTypeKey[] = [
  "SECURITY_INSTRUCTOR",
  "BODYGUARD",
  "SECURITY_TRAINING",
  "SPECIAL_SECURITY",
]

interface CredentialItem {
  id: string
  type: CredentialTypeKey
  status: "APPROVED" | "PENDING" | "REJECTED"
  documentUrl: string
  issuedDate: string | null
  approvedAt?: string | null
  rejectedAt?: string | null
  rejectionReason?: string | null
  createdAt: string
}

function getCredentialLabel(type: string): string {
  return CREDENTIAL_TYPE_LABELS[type] ?? CREDENTIAL_LABELS[type as CredentialTypeKey] ?? type
}

// ── 자격증 상태 카드 ──────────────────────────────────────────
function CredentialStatusCard({
  type,
  credential,
  onApply,
}: {
  type: CredentialTypeKey
  credential?: CredentialItem
  onApply: (type: CredentialTypeKey) => void
}) {
  const label = getCredentialLabel(type)

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-start justify-between gap-4">
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-50 border border-gray-200 shrink-0">
          <Award className="w-5 h-5 text-gray-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900">{label}</p>
          {!credential && (
            <p className="text-xs text-gray-400 mt-0.5">미등록</p>
          )}
          {credential?.status === "APPROVED" && credential.approvedAt && (
            <p className="text-xs text-gray-500 mt-0.5">
              승인일: {new Date(credential.approvedAt).toLocaleDateString("ko-KR")}
            </p>
          )}
          {credential?.status === "PENDING" && (
            <p className="text-xs text-amber-600 mt-0.5">관리자가 검토 중입니다. 영업일 기준 1~2일 소요됩니다.</p>
          )}
          {credential?.status === "REJECTED" && credential.rejectionReason && (
            <p className="text-xs text-red-600 mt-0.5">반려 사유: {credential.rejectionReason}</p>
          )}
        </div>
      </div>

      <div className="flex flex-col items-end gap-2 shrink-0">
        {!credential && (
          <button
            type="button"
            onClick={() => onApply(type)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-brand text-white hover:opacity-90 transition-opacity"
          >
            <Plus className="w-3.5 h-3.5" />
            신청하기
          </button>
        )}
        {credential?.status === "APPROVED" && (
          <div className="flex items-center gap-1.5">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <StatusBadge variant="approved" label="인증 완료" />
          </div>
        )}
        {credential?.status === "PENDING" && (
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-amber-500" />
            <StatusBadge variant="pending" label="심사 중" />
          </div>
        )}
        {credential?.status === "REJECTED" && (
          <div className="flex flex-col items-end gap-1.5">
            <div className="flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-red-500" />
              <StatusBadge variant="rejected" label="반려" />
            </div>
            <button
              type="button"
              onClick={() => onApply(type)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-brand text-brand hover:bg-blue-50 transition-colors"
            >
              재신청
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── 업로드 드롭존 ────────────────────────────────────────────
function UploadDropzone({
  selectedType,
  credentials,
  onSuccess,
  onCancel,
}: {
  selectedType: CredentialTypeKey
  credentials: CredentialItem[]
  onSuccess: (credential: CredentialItem) => void
  onCancel: () => void
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [issuedDate, setIssuedDate] = useState("")
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [dragOver, setDragOver] = useState(false)

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped) setFile(dropped)
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    if (!file) return

    setUploading(true)
    setMessage(null)

    try {
      const ext = file.name.split(".").pop() ?? "jpg"

      const urlRes = await fetch("/api/worker/credentials/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          credentialType: selectedType,
          contentType: file.type,
          fileExtension: ext,
        }),
      })
      if (!urlRes.ok) throw new Error("URL 생성 실패")
      const { uploadUrl, fileKey } = await urlRes.json()

      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      })
      if (!uploadRes.ok) throw new Error("S3 업로드 실패")

      const credRes = await fetch("/api/worker/credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          credentialType: selectedType,
          fileKey,
          issuedDate: issuedDate || null,
        }),
      })
      if (!credRes.ok) throw new Error("기록 저장 실패")

      const { credential } = await credRes.json()
      setMessage({ type: "success", text: CREDENTIAL_PAGE_LABELS.UPLOAD_SUCCESS })
      setTimeout(() => {
        onSuccess(credential)
      }, 1500)
    } catch {
      setMessage({ type: "error", text: CREDENTIAL_PAGE_LABELS.UPLOAD_FAILED })
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">
          {getCredentialLabel(selectedType)} 서류 업로드
        </h3>
        <button
          type="button"
          onClick={onCancel}
          className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          취소
        </button>
      </div>

      <form onSubmit={handleUpload} className="space-y-4">
        {/* 드롭존 */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
            dragOver
              ? "border-brand bg-blue-50"
              : file
              ? "border-green-400 bg-green-50"
              : "border-gray-200 hover:border-brand hover:bg-blue-50"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,application/pdf"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          <Upload className="w-8 h-8 mx-auto text-gray-300 mb-2" />
          {file ? (
            <div>
              <p className="text-sm font-semibold text-green-700">{file.name}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          ) : (
            <div>
              <p className="text-sm text-gray-500">파일을 드래그하거나 클릭해서 선택하세요</p>
              <p className="text-xs text-gray-400 mt-1">PDF, JPG, PNG 파일 (최대 10MB)</p>
            </div>
          )}
        </div>

        {/* 발급일 */}
        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">
            {CREDENTIAL_PAGE_LABELS.ISSUED_DATE}
          </label>
          <input
            type="date"
            value={issuedDate}
            onChange={(e) => setIssuedDate(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </div>

        <button
          type="submit"
          disabled={uploading || !file}
          className="w-full py-2.5 rounded-xl text-sm font-semibold bg-brand text-white hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {uploading ? (
            <>
              <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              {CREDENTIAL_PAGE_LABELS.UPLOADING}
            </>
          ) : (
            CREDENTIAL_PAGE_LABELS.UPLOAD_BTN
          )}
        </button>
      </form>

      {message && (
        <p className={`text-sm font-medium text-center ${message.type === "success" ? "text-green-600" : "text-sos"}`}>
          {message.text}
        </p>
      )}
    </div>
  )
}

// ── 메인 페이지 ──────────────────────────────────────────────
export default function CredentialsPage() {
  const [credentials, setCredentials] = useState<CredentialItem[]>([])
  const [uploadingType, setUploadingType] = useState<CredentialTypeKey | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/worker/credentials")
      .then((r) => r.json())
      .then((data) => setCredentials(data.credentials ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  function getCredential(type: CredentialTypeKey) {
    return credentials.find((c) => c.type === type)
  }

  function handleSuccess(credential: CredentialItem) {
    setCredentials((prev) => {
      const idx = prev.findIndex((c) => c.type === credential.type)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = credential
        return next
      }
      return [...prev, credential]
    })
    setUploadingType(null)
  }

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        title={CREDENTIAL_PAGE_LABELS.PAGE_TITLE}
        subtitle="자격증을 등록하면 업체에서 인증된 인력으로 검색됩니다."
      />

      {/* 자격증 현황 */}
      <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
          {CREDENTIAL_PAGE_LABELS.SECTION_LIST}
        </h2>

        {loading ? (
          <p className="text-sm text-gray-400">불러오는 중...</p>
        ) : (
          <div className="space-y-3">
            {MVP_CREDENTIAL_TYPES.map((type) => (
              <CredentialStatusCard
                key={type}
                type={type}
                credential={getCredential(type)}
                onApply={(t) => setUploadingType(t)}
              />
            ))}
          </div>
        )}

        {!loading && credentials.length === 0 && (
          <EmptyState
            icon={Award}
            title={CREDENTIAL_PAGE_LABELS.NO_CREDENTIALS}
            description="아래에서 자격증 서류를 업로드하면 관리자 심사 후 인증됩니다."
          />
        )}
      </div>

      {/* 업로드 드롭존 */}
      {uploadingType && (
        <UploadDropzone
          selectedType={uploadingType}
          credentials={credentials}
          onSuccess={handleSuccess}
          onCancel={() => setUploadingType(null)}
        />
      )}
    </div>
  )
}
