ALTER TABLE "companies"
ADD COLUMN "businessRegistrationNumber" TEXT,
ADD COLUMN "businessRegistrationFileUrl" TEXT,
ADD COLUMN "securityLicenseFileUrl" TEXT,
ADD COLUMN "additionalProofFileUrls" JSONB,
ADD COLUMN "approvedAt" TIMESTAMP(3),
ADD COLUMN "rejectedAt" TIMESTAMP(3),
ADD COLUMN "rejectionReason" TEXT,
ADD COLUMN "reviewedAt" TIMESTAMP(3);
