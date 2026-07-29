import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

if (!process.env.DATABASE_URL) {
  const { config } = require("dotenv")
  config({ path: ".env.local" })
}

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

async function main() {
  const w = await prisma.workerProfile.findUnique({
    where: { userId: "dev-worker2" },
    select: { id: true, latitude: true, longitude: true, isProfilePublic: true, availability: true, workFields: true },
  })
  console.log("dev-worker2 profile:", JSON.stringify(w, null, 2))

  const sos = await prisma.sosRequest.findMany({
    where: { status: { in: ["DISPATCHING", "PENDING"] } },
    select: { id: true, title: true, status: true, requiredFields: true, latitude: true, longitude: true, radiusKm: true },
  })
  console.log("Active SOS:", JSON.stringify(sos, null, 2))
}

main().catch(console.error).finally(() => prisma.$disconnect())
