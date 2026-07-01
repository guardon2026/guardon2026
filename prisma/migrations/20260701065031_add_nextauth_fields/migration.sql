-- DropIndex
DROP INDEX "credentials_status_type_idx";

-- DropIndex
DROP INDEX "sos_requests_location_gist";

-- DropIndex
DROP INDEX "worker_profiles_availability_idx";

-- DropIndex
DROP INDEX "worker_profiles_location_gist";

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "emailVerified" TIMESTAMP(3),
ADD COLUMN     "image" TEXT,
ALTER COLUMN "name" DROP NOT NULL,
ALTER COLUMN "role" DROP NOT NULL;
