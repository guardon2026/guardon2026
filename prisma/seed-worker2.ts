/**
 * 개발 환경 추가 경비 인력 생성
 * 실행: npx tsx prisma/seed-worker2.ts
 */
import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

if (!process.env.DATABASE_URL) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { config } = require("dotenv")
  config({ path: ".env.local" })
}

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log("🌱 경비 인력2 생성 시작...")

  await prisma.user.upsert({
    where: { id: "dev-worker2" },
    create: {
      id: "dev-worker2",
      name: "[DEV] 경비 인력2",
      email: "dev-worker2@guardon.dev",
      role: "WORKER",
    },
    update: { name: "[DEV] 경비 인력2", role: "WORKER" },
  })
  console.log("  ✓ User: dev-worker2")

  await prisma.workerProfile.upsert({
    where: { userId: "dev-worker2" },
    create: {
      userId: "dev-worker2",
      workFields: ["GENERAL_SECURITY", "SPECIAL_SECURITY"],
      experienceYears: 5,
      desiredHourlyRate: 16000,
      availability: "AVAILABLE",
      address: "서울특별시 마포구 홍익로 10",
      city: "서울특별시",
      district: "마포구",
      bio: "[DEV] 테스트 경비 인력2입니다.",
    },
    update: {},
  })
  console.log("  ✓ WorkerProfile: dev-worker2")

  console.log("\n✅ 완료!")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
