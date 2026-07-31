import { redirect } from "next/navigation"
import { getServerSession } from "@/lib/session"
import AdminPasswordForm from "./AdminPasswordForm"
import { PageHeader } from "@/components/ui/page-header"

export default async function AdminSettingsPage() {
  const session = await getServerSession()
  if (!session || session.user.role !== "ADMIN") redirect("/login")

  return (
    <div className="max-w-md mx-auto space-y-6">
      <PageHeader title="관리자 설정" subtitle="관리자 계정 비밀번호를 변경합니다." />
      <AdminPasswordForm />
    </div>
  )
}
