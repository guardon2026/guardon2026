import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CredentialBadge } from "@/components/ui/credential-badge"
import { StatusDot } from "@/components/ui/status-dot"
import { PrimaryButton } from "@/components/ui/primary-button"
import { BUTTON_LABELS, EMPTY_STATE } from "@/lib/constants"

export default function DesignPreview() {
  return (
    <main className="min-h-screen bg-gray-50 p-6 space-y-8">
      <h1 className="text-xl font-semibold">GuardOn 디자인 시스템 프리뷰</h1>

      <section>
        <h2 className="text-base font-semibold mb-4">버튼 (Buttons)</h2>
        <div className="flex gap-3 flex-wrap">
          <PrimaryButton intent="primary">{BUTTON_LABELS.SAVE}</PrimaryButton>
          <PrimaryButton intent="destructive">{BUTTON_LABELS.SOS}</PrimaryButton>
          <PrimaryButton intent="secondary">취소</PrimaryButton>
          <PrimaryButton intent="ghost">로그아웃</PrimaryButton>
          <PrimaryButton intent="primary" disabled>{BUTTON_LABELS.SAVING}</PrimaryButton>
        </div>
      </section>

      <section>
        <h2 className="text-base font-semibold mb-4">자격증 뱃지 (4종 × 3상태)</h2>
        <div className="grid grid-cols-3 gap-3 max-w-2xl">
          <CredentialBadge type="SECURITY_INSTRUCTOR" state="VERIFIED" />
          <CredentialBadge type="BODYGUARD" state="PENDING" />
          <CredentialBadge type="SECURITY_TRAINING" state="UNVERIFIED" />
          <CredentialBadge type="SPECIAL_SECURITY" state="VERIFIED" />
          <CredentialBadge type="SECURITY_INSTRUCTOR" state="PENDING" size="sm" />
          <CredentialBadge type="BODYGUARD" state="UNVERIFIED" size="sm" />
        </div>
      </section>

      <section>
        <h2 className="text-base font-semibold mb-4">가용 상태 (StatusDot)</h2>
        <div className="flex gap-3">
          <StatusDot status="AVAILABLE" />
          <StatusDot status="UNAVAILABLE" />
          <StatusDot status="BUSY" />
        </div>
      </section>

      <section>
        <h2 className="text-base font-semibold mb-4">카드 + 입력</h2>
        <Card className="max-w-md p-4 bg-white border-gray-100 rounded-xl shadow-sm">
          <Label htmlFor="preview-input" className="text-sm font-semibold text-gray-700 mb-1 block">
            업체명
          </Label>
          <Input id="preview-input" placeholder="업체명을 입력하세요" />
          <p className="text-xs text-gray-500 mt-2">Pretendard 폰트 샘플 텍스트입니다.</p>
        </Card>
      </section>

      <section>
        <h2 className="text-base font-semibold mb-4">빈 상태 (Empty state)</h2>
        <Card className="max-w-md p-6 text-center">
          <p className="text-base font-semibold">{EMPTY_STATE.HEADING}</p>
          <p className="text-sm text-gray-500 mt-1">{EMPTY_STATE.BODY}</p>
        </Card>
      </section>
    </main>
  )
}
