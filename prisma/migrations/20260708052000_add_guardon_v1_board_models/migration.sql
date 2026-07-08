DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SosUrgency') THEN
    CREATE TYPE "SosUrgency" AS ENUM ('NORMAL', 'FAST', 'URGENT', 'CRITICAL');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SosVisibility') THEN
    CREATE TYPE "SosVisibility" AS ENUM ('APPROVED_USERS', 'COMPANIES_ONLY', 'PRIVATE_LINK');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SosApplicationStatus') THEN
    CREATE TYPE "SosApplicationStatus" AS ENUM ('NEW', 'REVIEWING', 'CONTACTED', 'SELECTED', 'REJECTED', 'CANCELLED', 'REPORTED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SosApplicantType') THEN
    CREATE TYPE "SosApplicantType" AS ENUM ('COMPANY', 'GUARD');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ReportStatus') THEN
    CREATE TYPE "ReportStatus" AS ENUM ('OPEN', 'REVIEWING', 'RESOLVED', 'DISMISSED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SubscriptionPlan') THEN
    CREATE TYPE "SubscriptionPlan" AS ENUM ('FREE', 'STARTER', 'PRO', 'ENTERPRISE');
  END IF;
END $$;

ALTER TABLE "sos_requests"
ADD COLUMN IF NOT EXISTS "urgencyLevel" "SosUrgency" NOT NULL DEFAULT 'URGENT',
ADD COLUMN IF NOT EXISTS "serviceType" TEXT,
ADD COLUMN IF NOT EXISTS "region" TEXT,
ADD COLUMN IF NOT EXISTS "addressDetail" TEXT,
ADD COLUMN IF NOT EXISTS "addressVisibility" TEXT NOT NULL DEFAULT 'APPLICANTS_ONLY',
ADD COLUMN IF NOT EXISTS "applicationDeadline" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "budgetTotal" INTEGER,
ADD COLUMN IF NOT EXISTS "budgetPerPerson" INTEGER,
ADD COLUMN IF NOT EXISTS "budgetType" TEXT NOT NULL DEFAULT 'DAILY',
ADD COLUMN IF NOT EXISTS "paymentMethod" TEXT,
ADD COLUMN IF NOT EXISTS "requirements" JSONB,
ADD COLUMN IF NOT EXISTS "visibility" "SosVisibility" NOT NULL DEFAULT 'APPROVED_USERS',
ADD COLUMN IF NOT EXISTS "allowCompanyApplicants" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS "allowGuardApplicants" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS "ownerContactVisible" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "isAdConfirmed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "viewCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "applicationCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "closedAt" TIMESTAMP(3);

UPDATE "sos_requests"
SET
  "region" = COALESCE("region", concat_ws(' ', NULLIF("city", ''), NULLIF("district", ''))),
  "serviceType" = COALESCE("serviceType", '경호·보안'),
  "budgetPerPerson" = COALESCE("budgetPerPerson", "hourlyRate"),
  "budgetTotal" = COALESCE("budgetTotal", "hourlyRate" * "requiredCount");

CREATE TABLE IF NOT EXISTS "sos_applications" (
  "id" TEXT NOT NULL,
  "sosRequestId" TEXT NOT NULL,
  "applicantUserId" TEXT NOT NULL,
  "applicantType" "SosApplicantType" NOT NULL,
  "companyId" TEXT,
  "workerProfileId" TEXT,
  "status" "SosApplicationStatus" NOT NULL DEFAULT 'NEW',
  "availableHeadcount" INTEGER,
  "availableStartAt" TIMESTAMP(3),
  "availableEndAt" TIMESTAMP(3),
  "proposedRate" INTEGER,
  "proposedTotal" INTEGER,
  "contactName" TEXT,
  "contactPhone" TEXT,
  "contactEmail" TEXT,
  "message" TEXT,
  "introFileUrl" TEXT,
  "experienceSummary" TEXT,
  "profileConsent" BOOLEAN NOT NULL DEFAULT false,
  "adminMemo" TEXT,
  "contactedAt" TIMESTAMP(3),
  "selectedAt" TIMESTAMP(3),
  "rejectedAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),
  "reportedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "sos_applications_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "company_documents" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "fileUrl" TEXT NOT NULL,
  "fileName" TEXT,
  "mimeType" TEXT,
  "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
  "adminMemo" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewedAt" TIMESTAMP(3),
  CONSTRAINT "company_documents_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "guard_projects" (
  "id" TEXT NOT NULL,
  "workerProfileId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "role" TEXT,
  "startedAt" TIMESTAMP(3),
  "endedAt" TIMESTAMP(3),
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "guard_projects_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "contact_view_logs" (
  "id" TEXT NOT NULL,
  "viewerUserId" TEXT NOT NULL,
  "contactOwnerUserId" TEXT,
  "sosRequestId" TEXT,
  "applicationId" TEXT,
  "reason" TEXT,
  "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "contact_view_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "reports" (
  "id" TEXT NOT NULL,
  "reporterUserId" TEXT NOT NULL,
  "targetType" TEXT NOT NULL,
  "targetId" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "description" TEXT,
  "status" "ReportStatus" NOT NULL DEFAULT 'OPEN',
  "adminMemo" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" TIMESTAMP(3),
  CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "subscriptions" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "plan" "SubscriptionPlan" NOT NULL DEFAULT 'FREE',
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endedAt" TIMESTAMP(3),
  "nextBillingAt" TIMESTAMP(3),
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "audit_logs" (
  "id" TEXT NOT NULL,
  "actorUserId" TEXT,
  "action" TEXT NOT NULL,
  "targetType" TEXT NOT NULL,
  "targetId" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "sos_applications_sosRequestId_applicantUserId_key" ON "sos_applications"("sosRequestId", "applicantUserId");
CREATE INDEX IF NOT EXISTS "sos_applications_sosRequestId_idx" ON "sos_applications"("sosRequestId");
CREATE INDEX IF NOT EXISTS "sos_applications_applicantUserId_idx" ON "sos_applications"("applicantUserId");
CREATE INDEX IF NOT EXISTS "sos_applications_companyId_idx" ON "sos_applications"("companyId");
CREATE INDEX IF NOT EXISTS "sos_applications_workerProfileId_idx" ON "sos_applications"("workerProfileId");
CREATE INDEX IF NOT EXISTS "sos_applications_status_idx" ON "sos_applications"("status");
CREATE INDEX IF NOT EXISTS "company_documents_companyId_idx" ON "company_documents"("companyId");
CREATE INDEX IF NOT EXISTS "company_documents_type_idx" ON "company_documents"("type");
CREATE INDEX IF NOT EXISTS "guard_projects_workerProfileId_idx" ON "guard_projects"("workerProfileId");
CREATE INDEX IF NOT EXISTS "contact_view_logs_viewerUserId_idx" ON "contact_view_logs"("viewerUserId");
CREATE INDEX IF NOT EXISTS "contact_view_logs_contactOwnerUserId_idx" ON "contact_view_logs"("contactOwnerUserId");
CREATE INDEX IF NOT EXISTS "contact_view_logs_sosRequestId_idx" ON "contact_view_logs"("sosRequestId");
CREATE INDEX IF NOT EXISTS "contact_view_logs_applicationId_idx" ON "contact_view_logs"("applicationId");
CREATE INDEX IF NOT EXISTS "reports_reporterUserId_idx" ON "reports"("reporterUserId");
CREATE INDEX IF NOT EXISTS "reports_targetType_targetId_idx" ON "reports"("targetType", "targetId");
CREATE INDEX IF NOT EXISTS "reports_status_idx" ON "reports"("status");
CREATE INDEX IF NOT EXISTS "subscriptions_companyId_idx" ON "subscriptions"("companyId");
CREATE INDEX IF NOT EXISTS "subscriptions_status_idx" ON "subscriptions"("status");
CREATE INDEX IF NOT EXISTS "audit_logs_actorUserId_idx" ON "audit_logs"("actorUserId");
CREATE INDEX IF NOT EXISTS "audit_logs_targetType_targetId_idx" ON "audit_logs"("targetType", "targetId");
CREATE INDEX IF NOT EXISTS "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");
CREATE INDEX IF NOT EXISTS "sos_requests_applicationDeadline_idx" ON "sos_requests"("applicationDeadline");
CREATE INDEX IF NOT EXISTS "sos_requests_urgencyLevel_idx" ON "sos_requests"("urgencyLevel");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sos_applications_sosRequestId_fkey') THEN
    ALTER TABLE "sos_applications" ADD CONSTRAINT "sos_applications_sosRequestId_fkey"
    FOREIGN KEY ("sosRequestId") REFERENCES "sos_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sos_applications_applicantUserId_fkey') THEN
    ALTER TABLE "sos_applications" ADD CONSTRAINT "sos_applications_applicantUserId_fkey"
    FOREIGN KEY ("applicantUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sos_applications_companyId_fkey') THEN
    ALTER TABLE "sos_applications" ADD CONSTRAINT "sos_applications_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sos_applications_workerProfileId_fkey') THEN
    ALTER TABLE "sos_applications" ADD CONSTRAINT "sos_applications_workerProfileId_fkey"
    FOREIGN KEY ("workerProfileId") REFERENCES "worker_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'company_documents_companyId_fkey') THEN
    ALTER TABLE "company_documents" ADD CONSTRAINT "company_documents_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'guard_projects_workerProfileId_fkey') THEN
    ALTER TABLE "guard_projects" ADD CONSTRAINT "guard_projects_workerProfileId_fkey"
    FOREIGN KEY ("workerProfileId") REFERENCES "worker_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'contact_view_logs_viewerUserId_fkey') THEN
    ALTER TABLE "contact_view_logs" ADD CONSTRAINT "contact_view_logs_viewerUserId_fkey"
    FOREIGN KEY ("viewerUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'contact_view_logs_contactOwnerUserId_fkey') THEN
    ALTER TABLE "contact_view_logs" ADD CONSTRAINT "contact_view_logs_contactOwnerUserId_fkey"
    FOREIGN KEY ("contactOwnerUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'contact_view_logs_sosRequestId_fkey') THEN
    ALTER TABLE "contact_view_logs" ADD CONSTRAINT "contact_view_logs_sosRequestId_fkey"
    FOREIGN KEY ("sosRequestId") REFERENCES "sos_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'contact_view_logs_applicationId_fkey') THEN
    ALTER TABLE "contact_view_logs" ADD CONSTRAINT "contact_view_logs_applicationId_fkey"
    FOREIGN KEY ("applicationId") REFERENCES "sos_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reports_reporterUserId_fkey') THEN
    ALTER TABLE "reports" ADD CONSTRAINT "reports_reporterUserId_fkey"
    FOREIGN KEY ("reporterUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'subscriptions_companyId_fkey') THEN
    ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'audit_logs_actorUserId_fkey') THEN
    ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actorUserId_fkey"
    FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
