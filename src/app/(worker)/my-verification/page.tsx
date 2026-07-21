import { redirect } from "next/navigation"
import { getServerSession } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { UserRole } from "@prisma/client"
import { PageHeader } from "@/components/ui/page-header"
import { ShieldCheck } from "lucide-react"
import VerificationForm from "./VerificationForm"

export default async function MyVerificationPage() {
  const session = await getServerSession()
  if (!session?.user?.id) redirect("/login")
  if (session.user.role !== UserRole.WORKER) redirect("/")

  const profile = await prisma.workerProfile.findUnique({
    where: { userId: session.user.id },
    select: {
      id: true,
      rrn: true,
      rrnVerifiedAt: true,
      bankName: true,
      bankAccount: true,
      bankHolder: true,
      bankVerifiedAt: true,
    },
  })
  if (!profile) redirect("/profile/edit")

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <PageHeader
        title="본인 인증"
        subtitle="근로계약서·급여 지급을 위한 정보를 등록합니다."
        action={<ShieldCheck className="w-5 h-5 text-brand" />}
      />

      <div className="bg-blue-50 border border-blue-100 rounded-xl px-5 py-4 text-xs text-blue-700 space-y-1">
        <p className="font-semibold">안내</p>
        <p>· 주민등록번호 뒷자리는 첫 숫자만 저장되며 나머지는 즉시 마스킹 처리됩니다.</p>
        <p>· 계좌 정보는 급여 지급 및 포인트 출금에만 사용됩니다.</p>
        <p>· 등록된 정보는 암호화되어 안전하게 보관됩니다.</p>
      </div>

      <VerificationForm
        rrnVerifiedAt={profile.rrnVerifiedAt}
        bankVerifiedAt={profile.bankVerifiedAt}
        bankName={profile.bankName}
        bankAccount={profile.bankAccount}
        bankHolder={profile.bankHolder}
      />
    </div>
  )
}
