import { notFound, redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "@/lib/session"
import { UserRole, SosMatchStatus } from "@prisma/client"
import ContractForm from "@/components/ContractForm"
import { decryptPii, extractBirthDateFromRrn } from "@/lib/crypto"

interface Props {
  params: Promise<{ matchId: string }>
}

export default async function WorkerContractPage({ params }: Props) {
  const { matchId } = await params

  const session = await getServerSession()
  if (!session?.user?.id) redirect("/login")
  if (session.user.role !== UserRole.WORKER) redirect("/")

  const [workerProfile, user] = await Promise.all([
    prisma.workerProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true, address: true, bankName: true, bankAccount: true, bankHolder: true, rrn: true },
    }),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { phone: true },
    }),
  ])
  if (!workerProfile) redirect("/profile")

  let birthDate: string | null = null
  if (workerProfile.rrn) {
    try {
      birthDate = extractBirthDateFromRrn(decryptPii(workerProfile.rrn))
    } catch {
      birthDate = null
    }
  }

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
          prefill={{
            workerBirthDate: birthDate ?? undefined,
            workerAddress: workerProfile.address ?? undefined,
            workerPhone: user?.phone ?? undefined,
            workerBankName: workerProfile.bankName ?? undefined,
            workerAccountNum: workerProfile.bankAccount ?? undefined,
            workerAccountHolder: workerProfile.bankHolder ?? undefined,
          }}
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
