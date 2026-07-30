import { redirect } from "next/navigation"
import { getServerSession } from "@/lib/session"

export default async function AfterLoginPage() {
  const session = await getServerSession()
  if (!session?.user?.id) redirect("/login")

  const role = session.user.role

  if (!role) redirect("/onboarding")

  switch (role) {
    case "COMPANY_OWNER":
      redirect("/sos")
    case "WORKER":
      redirect("/sos")
    case "ADMIN":
      redirect("/members")
    default:
      redirect("/onboarding")
  }
}
