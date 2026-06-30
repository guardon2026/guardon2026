import { getServerSession } from "@/lib/session"
import { redirect } from "next/navigation"
import { AdminSidebar } from "@/components/admin/AdminSidebar"

// (admin) 라우트 그룹 — URL에 /admin prefix 없음
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession()
  if (!session || session.user.role !== "ADMIN") redirect("/login")

  return (
    <div className="flex min-h-screen">
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto bg-gray-50">
        {/* 모바일: pt-14 (고정 상단바 높이만큼), 데스크톱: pt-8 */}
        <div className="p-4 pt-[calc(1rem+3.5rem)] md:p-8">{children}</div>
      </main>
    </div>
  )
}
