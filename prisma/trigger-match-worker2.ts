import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

if (!process.env.DATABASE_URL) {
  const { config } = require("dotenv")
  config({ path: ".env.local" })
}

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

async function main() {
  const profile = await prisma.workerProfile.findUnique({
    where: { userId: "dev-worker2" },
    select: { id: true },
  })
  if (!profile) throw new Error("dev-worker2 workerProfile not found")

  const { matchSosRequestsForWorker } = await import("../src/lib/sos-matcher")
  const count = await matchSosRequestsForWorker(profile.id, "dev-worker2")
  console.log(`✅ 매칭된 SOS 건수: ${count}`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
