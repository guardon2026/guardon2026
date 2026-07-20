import { notFound, redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "@/lib/session"
import { UserRole, SosMatchStatus } from "@prisma/client"
import ContractForm from "@/components/ContractForm"

interface Props {
  params: Promise<{ matchId: string }>
}

export default async function WorkerContractPage({ params }: Props) {
  const { matchId } = await params

  const session = await getServerSession()
  if (!session?.user?.id) redirect("/login")
  if (session.user.role !== UserRole.WORKER) redirect("/")

  const workerProfile = await prisma.workerProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  })
  if (!workerProfile) redirect("/profile/edit")

  const match = await prisma.sosMatch.findUnique({
    where: { id: matchId },
    include: {
      sosRequest: {
        include: { company: { select: { name: true, address: true, businessRegistrationNumber: true } } },
      },
      workContract: true,
    },
  })

  if (!match || match.workerProfileId !== workerProfile.id) notFound()
  if (match.status !== SosMatchStatus.CONFIRMED) redirect(`/worker-history/${matchId}`)

  const sos = match.sosRequest
  const days = Array.isArray(sos.scheduleDays) ? sos.scheduleDays as Array<{
    date: string; endDate?: string; startTime: string; endTime: string
  }> : null

  const workPeriod = days && days.length > 0
    ? `${days[0].date} ~ ${days[days.length - 1].endDate ?? days[days.length - 1].date}`
    : `${sos.scheduledAt.toISOString().slice(0, 10)} ~ ${sos.scheduledEndAt?.toISOString().slice(0, 10) ?? ""}`

  const workHours = days && days.length > 0
    ? days.map(d => `${d.date} ${d.startTime}~${d.endTime}`).join(", ")
    : ""

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <ContractForm
          matchId={matchId}
          sosId={sos.id}
          role="worker"
          contract={match.workContract}
          sosInfo={{
            title: sos.title,
            locationAddress: sos.locationAddress,
            hourlyRate: sos.hourlyRate,
            workPeriod,
            workHours,
            workerName: session.user.name ?? "",
          }}
        />
      </div>
    </div>
  )
}
