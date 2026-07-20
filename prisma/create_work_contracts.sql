CREATE TABLE IF NOT EXISTS work_contracts (
  id                   TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "sosRequestId"       TEXT NOT NULL REFERENCES sos_requests(id),
  "sosMatchId"         TEXT NOT NULL UNIQUE REFERENCES sos_matches(id),
  "employerBizNumber"  TEXT,
  "employerName"       TEXT,
  "employerCeoName"    TEXT,
  "employerAddress"    TEXT,
  "employerSignedAt"   TIMESTAMPTZ,
  "workerRealName"     TEXT,
  "workerBirthDate"    TEXT,
  "workerAddress"      TEXT,
  "workerPhone"        TEXT,
  "workerBankName"     TEXT,
  "workerAccountNum"   TEXT,
  "workerAccountHolder" TEXT,
  "workerSignedAt"     TIMESTAMPTZ,
  "createdAt"          TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS work_contracts_sosRequestId_idx ON work_contracts("sosRequestId");
