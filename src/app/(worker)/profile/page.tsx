import { getServerSession } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { PageHeader } from "@/components/ui/page-header"
import {
  WORKER_PUBLIC_PROFILE,
  type WorkFieldKey,
  type CredentialTypeKey,
  type AvailabilityStatusKey,
} from "@/lib/constants"
import { getWorkerCompleteness } from "@/lib/worker-completeness"
import ProfileClient from "./ProfileClient"

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>
}) {
  const session = await getServerSession()

  if (!session?.user?.id) {
    return (
      <div className="space-y-6">
        <PageHeader title={WORKER_PUBLIC_PROFILE.PAGE_TITLE} />
        <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-8 text-center">
          <p className="text-base font-semibold text-gray-700">로그인이 필요합니다.</p>
        </div>
      </div>
    )
  }

  const { edit } = await searchParams

  const [profile, user, pointAccount, recentContracts] = await Promise.all([
    prisma.workerProfile.findUnique({
      where: { userId: session.user.id },
      include: {
        credentials: {
          select: { id: true, type: true, status: true, approvedAt: true, rejectionReason: true },
          orderBy: { createdAt: "asc" },
        },
      },
    }),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, phone: true, deletedAt: true },
    }),
    prisma.pointAccount.findUnique({
      where: { userId: session.user.id },
      select: { balance: true },
    }),
    prisma.sosMatch.findMany({
      where: {
        workerProfile: { userId: session.user.id },
        status: "CONFIRMED",
      },
      include: {
        sosRequest: { select: { title: true, scheduledAt: true } },
        workContract: { select: { employerSignedAt: true, workerSignedAt: true } },
      },
      orderBy: { confirmedAt: "desc" },
      take: 3,
    }),
  ])

  if (user?.deletedAt) {
    return (
      <div className="space-y-6">
        <PageHeader title={WORKER_PUBLIC_PROFILE.PAGE_TITLE} />
        <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-8 text-center">
          <p className="text-base font-semibold text-gray-700">접근할 수 없는 계정입니다.</p>
        </div>
      </div>
    )
  }

  const missingProfileItems = profile
    ? getWorkerCompleteness({
        address: profile.address,
        city: profile.city,
        district: profile.district,
        bankVerifiedAt: profile.bankVerifiedAt,
        user: { name: user?.name ?? null, phone: user?.phone ?? null },
      }).missing
    : []

  return (
    <ProfileClient
      hasProfile={!!profile}
      startEditing={edit === "1"}
      name={user?.name ?? ""}
      phone={user?.phone ?? null}
      profileImageUrl={profile?.profileImageUrl ?? null}
      availability={(profile?.availability ?? "AVAILABLE") as AvailabilityStatusKey}
      averageRating={profile?.averageRating ?? 0}
      totalMatches={profile?.totalMatches ?? 0}
      address={profile?.address ?? null}
      city={profile?.city ?? null}
      district={profile?.district ?? null}
      workFields={(profile?.workFields ?? []) as WorkFieldKey[]}
      declaredCredentials={(profile?.declaredCredentials ?? []) as CredentialTypeKey[]}
      experienceYears={profile?.experienceYears ?? 0}
      height={profile?.height ?? null}
      weight={profile?.weight ?? null}
      desiredHourlyRate={profile?.desiredHourlyRate ?? null}
      bio={profile?.bio ?? null}
      credentials={profile?.credentials ?? []}
      bankName={profile?.bankName ?? null}
      bankAccount={profile?.bankAccount ?? null}
      bankHolder={profile?.bankHolder ?? null}
      bankVerifiedAt={profile?.bankVerifiedAt ?? null}
      rrnRegisteredAt={profile?.rrnRegisteredAt ?? null}
      missingProfileItems={missingProfileItems}
      pointBalance={pointAccount?.balance ?? 0}
      recentContracts={recentContracts}
    />
  )
}
