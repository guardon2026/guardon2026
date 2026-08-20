import Link from "next/link"
import { AlertTriangle } from "lucide-react"

const VERIFICATION_ITEMS = new Set(["계좌 정보"])

/** 경비 인력의 SOS 신청·수락에 필요한 필수 정보 중 빠진 항목을 안내하는 배너 */
export function ProfileCompletenessBanner({ missing }: { missing: string[] }) {
  if (missing.length === 0) return null

  const editItems = missing.filter((m) => !VERIFICATION_ITEMS.has(m))
  const verificationItems = missing.filter((m) => VERIFICATION_ITEMS.has(m))

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-2">
      <div className="flex items-start gap-2.5">
        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-sm font-semibold text-amber-800">
            프로필에 빠진 정보가 있어 SOS 신청·수락이 제한됩니다
          </p>
          <p className="text-xs text-amber-700">
            빠진 항목: {missing.join(", ")}
          </p>
        </div>
      </div>
      <div className="flex gap-2 pl-6">
        {editItems.length > 0 && (
          <Link
            href="/profile/edit"
            className="text-xs font-medium text-brand hover:underline"
          >
            프로필 정보 입력하기 →
          </Link>
        )}
        {verificationItems.length > 0 && (
          <Link
            href="/my-verification"
            className="text-xs font-medium text-brand hover:underline"
          >
            계좌 정보 등록하기 →
          </Link>
        )}
      </div>
    </div>
  )
}
