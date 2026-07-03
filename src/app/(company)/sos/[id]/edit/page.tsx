import { notFound, redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/session"
import { requireApprovedCompany, CompanyNotApprovedError } from "@/lib/company-gate"
import EditSosForm from "./EditSosForm"

interface Props {
  params: Promise<{ id: string }>
}

export default async function SosEditPage({ params }: Props) {
  const { id } = await params

  let session
  try {
    session = await requireRole("COMPANY_OWNER")
  } catch {
    redirect("/login")
  }

  try {
    await requireApprovedCompany(session.user.id)
  } catch (e: unknown) {
    if ((e as { name?: string })?.name === "CompanyNotApprovedError") redirect("/pending")
    throw e
  }

  const company = await prisma.company.findUnique({
    where: { ownerId: session.user.id },
    select: { id: true },
  })
  if (!company) redirect("/register")

  const sos = await prisma.sosRequest.findUnique({
    where: { id },
    select: {
      id: true,
      companyId: true,
      status: true,
      title: true,
      locationAddress: true,
      scheduledAt: true,
      scheduledEndAt: true,
      scheduleDays: true,
      requiredCount: true,
      requiredFields: true,
      requiredCredentials: true,
      hourlyRate: true,
      description: true,
    },
  })

  if (!sos) notFound()
  if (sos.companyId !== company.id) notFound()
  if (["COMPLETED", "CANCELLED"].includes(sos.status)) redirect(`/sos/${id}`)

  return (
    <EditSosForm
      initial={{
        id: sos.id,
        title: sos.title,
        locationAddress: sos.locationAddress,
        scheduleDays: sos.scheduleDays as { date: string; startTime: string; endDate?: string; endTime: string }[] | null,
        scheduledAt: sos.scheduledAt.toISOString(),
        scheduledEndAt: sos.scheduledEndAt?.toISOString() ?? null,
        requiredCount: sos.requiredCount,
        requiredFields: sos.requiredFields,
        requiredCredentials: sos.requiredCredentials,
        hourlyRate: sos.hourlyRate,
        description: sos.description,
      }}
    />
  )
}
