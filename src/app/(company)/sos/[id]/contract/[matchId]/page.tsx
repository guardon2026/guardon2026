import { notFound, redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "@/lib/session"
import { UserRole, SosMatchStatus } from "@prisma/client"
import ContractForm from "@/components/ContractForm"

interface Props {
  params: Promise<{ id: string; matchId: string }>
}

export default async function CompanyContractPage({ params }: Props) {
  const { id, matchId } = await params

  const session = await getServerSession()
  if (!session?.user?.id) redirect("/login")
  if (session.user.role !== UserRole.COMPANY_OWNER) redirect("/")

  const match = await prisma.sosMatch.findUnique({
    where: { id: matchId },
    include: {
      sosRequest: {
        include: { company: { select: { ownerId: true, name: true, address: true, businessRegistrationNumber: true } } },
      },
      workerProfile: {
        include: { user: { select: { name: true, phone: true } } },
      },
      workContract: true,
    },
  })

  if (!match || match.sosRequest.id !== id) notFound()
  if (match.sosRequest.company.ownerId !== session.user.id) redirect("/sos")
  if (match.status !== SosMatchStatus.CONFIRMED) redirect(`/sos/${id}`)

  const sos = match.sosRequest

  // scheduleDays에서 근무 기간 파싱
  const days = Array.isArray(sos.scheduleDays) ? sos.scheduleDays as Array<{
    date: string; endDate?: string; startTime: string; endTime: string; requiredCount?: number
  }> : null

  const workPeriod = days && days.length > 0
    ? `${days[0].date} ~ ${days[days.length - 1].endDate ?? days[days.length - 1].date}`
    : `${sos.scheduledAt.toISOString().slice(0, 10)} ~ ${sos.scheduledEndAt?.toISOString().slice(0, 10) ?? ""}`

  const workHours = days && days.length > 0
    ? days.map(d => `${d.date} ${d.startTime}~${d.endTime}`).join(", ")
    : `${sos.scheduledAt.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })} ~ ${sos.scheduledEndAt?.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }) ?? ""}`

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <ContractForm
          matchId={matchId}
          sosId={id}
          role="employer"
          contract={match.workContract}
          prefill={{
            employerName: sos.company.name,
            employerBizNumber: sos.company.businessRegistrationNumber ?? "",
            employerAddress: sos.company.address,
          }}
          sosInfo={{
            title: sos.title,
            locationAddress: sos.locationAddress,
            hourlyRate: sos.hourlyRate,
            workPeriod,
            workHours,
            workerName: match.workerProfile.user.name ?? "",
          }}
        />
      </div>
    </div>
  )
}
