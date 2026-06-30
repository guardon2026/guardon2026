/**
 * 개발 환경 시드 데이터
 * dev_role 쿠키 세션과 매핑되는 실제 DB 레코드 생성
 *
 * 실행: npx prisma db seed
 */
import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

// Load .env.local in dev (tsx doesn't auto-load Next.js env files)
if (!process.env.DATABASE_URL) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { config } = require("dotenv")
  config({ path: ".env.local" })
}

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log("🌱 시드 시작...")

  // ─────────────────────────────────────────
  // 1. 기본 dev 유저 3명 upsert
  // ─────────────────────────────────────────
  const devUsers = [
    { id: "dev-company_owner", role: "COMPANY_OWNER" as const, name: "[DEV] 업체 대표",  email: "dev-company_owner@guardon.dev" },
    { id: "dev-worker",        role: "WORKER"         as const, name: "[DEV] 경비 인력",  email: "dev-worker@guardon.dev" },
    { id: "dev-admin",         role: "ADMIN"           as const, name: "[DEV] 관리자",     email: "dev-admin@guardon.dev" },
  ]

  for (const u of devUsers) {
    await prisma.user.upsert({
      where: { id: u.id },
      create: { id: u.id, name: u.name, email: u.email, role: u.role },
      update: { name: u.name, role: u.role },
    })
    console.log(`  ✓ User: ${u.id}`)
  }

  // ─────────────────────────────────────────
  // 2. 추가 샘플 업체 오너 유저 2명
  // ─────────────────────────────────────────
  const extraOwners = [
    { id: "dev-company2", role: "COMPANY_OWNER" as const, name: "[DEV] 업체2 대표", email: "dev-company2@guardon.dev" },
    { id: "dev-company3", role: "COMPANY_OWNER" as const, name: "[DEV] 업체3 대표", email: "dev-company3@guardon.dev" },
  ]

  for (const u of extraOwners) {
    await prisma.user.upsert({
      where: { id: u.id },
      create: { id: u.id, name: u.name, email: u.email, role: u.role },
      update: { name: u.name, role: u.role },
    })
    console.log(`  ✓ User: ${u.id}`)
  }

  // ─────────────────────────────────────────
  // 3. 메인 dev 업체 (APPROVED)
  // ─────────────────────────────────────────
  await prisma.company.upsert({
    where: { ownerId: "dev-company_owner" },
    create: {
      ownerId: "dev-company_owner",
      name: "[DEV] 가나다 경비",
      licenseNumber: "서울-2024-001",
      address: "서울특별시 강남구 테헤란로 123",
      city: "서울특별시",
      district: "강남구",
      phone: "02-1234-5678",
      status: "APPROVED",
      isActive: true,
      licenseVerified: true,
    },
    update: {},
  })
  console.log("  ✓ Company: dev-company_owner → APPROVED")

  // ─────────────────────────────────────────
  // 4. 추가 샘플 업체 2개 (admin 관리 페이지용)
  // ─────────────────────────────────────────
  await prisma.company.upsert({
    where: { ownerId: "dev-company2" },
    create: {
      ownerId: "dev-company2",
      name: "[DEV] 라마바 경비",
      licenseNumber: "경기-2024-002",
      address: "경기도 성남시 분당구 판교로 100",
      city: "경기도",
      district: "성남시",
      phone: "031-555-1234",
      status: "PENDING",
      isActive: false,
      licenseVerified: false,
      description: "판교 및 수도권 남부 전문 경비업체입니다.",
    },
    update: {},
  })
  console.log("  ✓ Company: dev-company2 → PENDING")

  await prisma.company.upsert({
    where: { ownerId: "dev-company3" },
    create: {
      ownerId: "dev-company3",
      name: "[DEV] 사아자 경비",
      licenseNumber: "부산-2024-003",
      address: "부산광역시 해운대구 센텀시티로 200",
      city: "부산광역시",
      district: "해운대구",
      phone: "051-777-5678",
      status: "APPROVED",
      isActive: true,
      licenseVerified: true,
      description: "부산·경남 지역 특수경비 전문업체입니다.",
    },
    update: {},
  })
  console.log("  ✓ Company: dev-company3 → APPROVED")

  // ─────────────────────────────────────────
  // 5. dev-worker WorkerProfile
  // ─────────────────────────────────────────
  await prisma.workerProfile.upsert({
    where: { userId: "dev-worker" },
    create: {
      userId: "dev-worker",
      workFields: ["GENERAL_SECURITY", "EVENT_SECURITY"],
      experienceYears: 3,
      desiredHourlyRate: 15000,
      availability: "AVAILABLE",
      address: "서울특별시 강남구 테헤란로 1",
      city: "서울특별시",
      district: "강남구",
      // SOS 반경 매칭(ST_DWithin)이 동작하려면 lat/lng + location이 필수.
      // 코엑스(SOS 시드 좌표) 인근으로 설정해 매칭 데모가 항상 성공하도록 함.
      latitude: 37.5088,
      longitude: 127.0633,
      bio: "[DEV] 테스트 경비 인력입니다.",
    },
    update: {
      latitude: 37.5088,
      longitude: 127.0633,
    },
  })
  console.log("  ✓ WorkerProfile: dev-worker")

  // workerProfile id 조회
  const workerProfile = await prisma.workerProfile.findUnique({
    where: { userId: "dev-worker" },
  })
  if (!workerProfile) throw new Error("dev-worker WorkerProfile not found")

  // PostGIS location 컬럼은 lat/lng로부터 별도 raw SQL로 채워야 함 (ST_DWithin 매칭 전제조건)
  await prisma.$queryRaw`
    UPDATE worker_profiles
    SET location = ST_SetSRID(ST_MakePoint(${workerProfile.longitude}, ${workerProfile.latitude}), 4326)::geography
    WHERE id = ${workerProfile.id}
  `
  console.log("  ✓ WorkerProfile location (PostGIS) set for dev-worker")

  // dev-company_owner 의 company id 조회
  const mainCompany = await prisma.company.findUnique({
    where: { ownerId: "dev-company_owner" },
  })
  if (!mainCompany) throw new Error("main company not found")

  // ─────────────────────────────────────────
  // 6. SOS 요청 3개
  // ─────────────────────────────────────────
  const scheduledBase = new Date("2026-04-20T09:00:00+09:00")

  // SOS 1: CONFIRMED (이력 페이지용)
  const sos1 = await prisma.sosRequest.upsert({
    where: { id: "dev-sos-confirmed" },
    create: {
      id: "dev-sos-confirmed",
      companyId: mainCompany.id,
      title: "[DEV] 강남 행사 경비 긴급 충원",
      locationAddress: "서울특별시 강남구 코엑스 광장",
      city: "서울특별시",
      district: "강남구",
      latitude: 37.5115,
      longitude: 127.0595,
      scheduledAt: scheduledBase,
      requiredCount: 2,
      requiredFields: ["EVENT_SECURITY"],
      requiredCredentials: [],
      hourlyRate: 14000,
      description: "코엑스 전시 행사 경비 인력 긴급 충원",
      status: "CONFIRMED",
      confirmedAt: new Date("2026-04-18T10:00:00+09:00"),
      dispatchedAt: new Date("2026-04-17T08:00:00+09:00"),
    },
    update: {},
  })
  console.log("  ✓ SosRequest: CONFIRMED")

  // SOS 2: PENDING (현황 페이지용)
  const sos2 = await prisma.sosRequest.upsert({
    where: { id: "dev-sos-pending" },
    create: {
      id: "dev-sos-pending",
      companyId: mainCompany.id,
      title: "[DEV] 서초구 건물 야간 경비 충원",
      locationAddress: "서울특별시 서초구 서초대로 300",
      city: "서울특별시",
      district: "서초구",
      latitude: 37.4836,
      longitude: 127.0327,
      scheduledAt: new Date("2026-04-21T22:00:00+09:00"),
      requiredCount: 1,
      requiredFields: ["GENERAL_SECURITY"],
      requiredCredentials: [],
      hourlyRate: 13000,
      description: "야간 단독 건물 경비 당일 충원",
      status: "PENDING",
      dispatchedAt: new Date("2026-04-15T07:00:00+09:00"),
    },
    update: {},
  })
  console.log("  ✓ SosRequest: PENDING")

  // SOS 3: UNRESOLVED (모니터링용)
  const sos3 = await prisma.sosRequest.upsert({
    where: { id: "dev-sos-unresolved" },
    create: {
      id: "dev-sos-unresolved",
      companyId: mainCompany.id,
      title: "[DEV] 송파구 행사 특수경비 긴급",
      locationAddress: "서울특별시 송파구 올림픽로 240",
      city: "서울특별시",
      district: "송파구",
      latitude: 37.5149,
      longitude: 127.1058,
      scheduledAt: new Date("2026-04-16T08:00:00+09:00"),
      requiredCount: 3,
      requiredFields: ["SPECIAL_SECURITY", "EVENT_SECURITY"],
      requiredCredentials: ["SPECIAL_SECURITY"],
      hourlyRate: 16000,
      description: "스포츠 경기장 특수경비 미해결 건",
      status: "UNRESOLVED",
      unresolvedAt: new Date("2026-04-15T20:00:00+09:00"),
      dispatchedAt: new Date("2026-04-14T08:00:00+09:00"),
    },
    update: {},
  })
  console.log("  ✓ SosRequest: UNRESOLVED")

  // ─────────────────────────────────────────
  // 7. SosMatch 레코드
  // ─────────────────────────────────────────

  // CONFIRMED SOS → dev-worker CONFIRMED
  await prisma.sosMatch.upsert({
    where: { sosRequestId_workerProfileId: { sosRequestId: sos1.id, workerProfileId: workerProfile.id } },
    create: {
      sosRequestId: sos1.id,
      workerProfileId: workerProfile.id,
      status: "CONFIRMED",
      respondedAt: new Date("2026-04-17T09:00:00+09:00"),
      confirmedAt: new Date("2026-04-18T10:00:00+09:00"),
    },
    update: {},
  })
  console.log("  ✓ SosMatch: sos1 ← dev-worker (CONFIRMED)")

  // PENDING SOS → dev-worker ACCEPTED
  await prisma.sosMatch.upsert({
    where: { sosRequestId_workerProfileId: { sosRequestId: sos2.id, workerProfileId: workerProfile.id } },
    create: {
      sosRequestId: sos2.id,
      workerProfileId: workerProfile.id,
      status: "ACCEPTED",
      respondedAt: new Date("2026-04-15T08:00:00+09:00"),
    },
    update: {},
  })
  console.log("  ✓ SosMatch: sos2 ← dev-worker (ACCEPTED)")

  // ─────────────────────────────────────────
  // 8. Notification 3개 (dev-worker 용)
  // ─────────────────────────────────────────
  const notifBase = [
    {
      id: "dev-notif-1",
      title: "새로운 SOS 요청이 도착했습니다",
      body: "강남구 행사 경비 긴급 충원 요청입니다. 지금 바로 확인해 주세요.",
      isRead: false,
      sosRequestId: sos2.id,
    },
    {
      id: "dev-notif-2",
      title: "배치가 최종 확정되었습니다",
      body: "강남 행사 경비 요청에 배치가 확정되었습니다. 일정을 확인해 주세요.",
      isRead: true,
      sosRequestId: sos1.id,
    },
    {
      id: "dev-notif-3",
      title: "자격증 심사가 완료되었습니다",
      body: "경비지도사 자격증 심사가 완료되어 인증되었습니다.",
      isRead: true,
      sosRequestId: null,
    },
  ]

  for (const n of notifBase) {
    await prisma.notification.upsert({
      where: { id: n.id },
      create: {
        id: n.id,
        userId: "dev-worker",
        sosRequestId: n.sosRequestId,
        type: "SOS_NOTIFIED",
        channel: "IN_APP",
        status: "DELIVERED",
        title: n.title,
        body: n.body,
        isRead: n.isRead,
        sentAt: new Date(),
      },
      update: {},
    })
    console.log(`  ✓ Notification: ${n.id} (isRead=${n.isRead})`)
  }

  // ─────────────────────────────────────────
  // 9. Credential 2개 (dev-worker 용)
  // ─────────────────────────────────────────

  // APPROVED: 경비지도사
  await prisma.credential.upsert({
    where: { workerProfileId_type: { workerProfileId: workerProfile.id, type: "SECURITY_INSTRUCTOR" } },
    create: {
      workerProfileId: workerProfile.id,
      type: "SECURITY_INSTRUCTOR",
      status: "APPROVED",
      documentUrl: "https://storage.guardon.dev/dev/credential-security-instructor.pdf",
      issuedDate: new Date("2022-03-15"),
      approvedAt: new Date("2026-01-10T10:00:00+09:00"),
    },
    update: {},
  })
  console.log("  ✓ Credential: SECURITY_INSTRUCTOR → APPROVED")

  // PENDING: 신임경비교육이수
  await prisma.credential.upsert({
    where: { workerProfileId_type: { workerProfileId: workerProfile.id, type: "SECURITY_TRAINING" } },
    create: {
      workerProfileId: workerProfile.id,
      type: "SECURITY_TRAINING",
      status: "PENDING",
      documentUrl: "https://storage.guardon.dev/dev/credential-security-training.pdf",
      issuedDate: new Date("2026-04-01"),
    },
    update: {},
  })
  console.log("  ✓ Credential: SECURITY_TRAINING → PENDING")

  console.log("\n✅ 시드 완료!")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
